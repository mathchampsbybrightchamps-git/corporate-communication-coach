package com.communicationcoach.fluxsy

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.io.ByteArrayOutputStream
import kotlin.concurrent.thread

/**
 * Foreground service that owns meeting audio capture.
 *
 * Recording lives here rather than in MainActivity so it survives screen lock, app
 * backgrounding and activity recreation. Android will otherwise suspend microphone access
 * once the app leaves the foreground.
 *
 * Transcribed chunks are handed to [listener] when the UI is attached, and buffered in
 * [pendingResults] when it is not, so nothing is lost while the screen is off.
 */
class MeetingCaptureService : Service() {

    private var audioRecord: AudioRecord? = null
    @Volatile private var isCapturing = false
    private var captureThread: Thread? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var chunkSeconds = 20
    private var startedAtMs = 0L

    companion object {
        const val ACTION_START = "com.communicationcoach.fluxsy.MEETING_START"
        const val ACTION_STOP = "com.communicationcoach.fluxsy.MEETING_STOP"
        const val EXTRA_CHUNK_SECONDS = "chunkSeconds"

        const val CHANNEL_ID = "ccos_meeting_capture_channel"
        const val NOTIFICATION_ID = 4711

        /** Set by MainActivity while the WebView is alive; cleared when it goes away. */
        @Volatile var listener: ((String) -> Unit)? = null

        /** Results produced while no listener was attached (screen off, activity destroyed). */
        val pendingResults = mutableListOf<String>()

        @Volatile var isRunning = false
            private set

        /** Running roster + language hint, refreshed by the web layer as speakers appear. */
        @Volatile var contextJson: String = "{}"

        /** Delivers a result to the UI, or buffers it until the UI comes back. */
        fun emit(result: String) {
            val target = listener
            if (target != null) {
                target(result)
            } else {
                synchronized(pendingResults) { pendingResults.add(result) }
            }
        }

        /** Called when the UI reattaches, to replay anything captured while it was away. */
        fun drainPending(): List<String> = synchronized(pendingResults) {
            val copy = pendingResults.toList()
            pendingResults.clear()
            copy
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopCapture()
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                chunkSeconds = (intent?.getIntExtra(EXTRA_CHUNK_SECONDS, 20) ?: 20)
                    .let { if (it in 5..60) it else 20 }
                startCapture()
            }
        }
        // Restarting a meeting recording with no audio context would be misleading.
        return START_NOT_STICKY
    }

    private fun startCapture() {
        if (isCapturing) return

        startedAtMs = System.currentTimeMillis()
        startForegroundWithType()
        acquireWakeLock()

        val minBuffer = AudioRecord.getMinBufferSize(
            GeminiClient.SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        if (minBuffer <= 0) {
            emit(GeminiClient.buildErrorEnvelope("Microphone unavailable on this device."))
            stopSelf()
            return
        }

        val recorder = try {
            AudioRecord(
                MediaRecorder.AudioSource.MIC,
                GeminiClient.SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                minBuffer * 4
            )
        } catch (e: SecurityException) {
            emit(GeminiClient.buildErrorEnvelope("Microphone access blocked: ${e.message}"))
            stopSelf()
            return
        }

        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            recorder.release()
            emit(GeminiClient.buildErrorEnvelope("Could not initialise the microphone."))
            stopSelf()
            return
        }

        audioRecord = recorder
        isCapturing = true
        isRunning = true
        recorder.startRecording()

        val chunkBytes = GeminiClient.SAMPLE_RATE * GeminiClient.BYTES_PER_SAMPLE * chunkSeconds

        captureThread = thread(name = "ccos-meeting-capture") {
            val buffer = ByteArray(minBuffer)
            val pending = ByteArrayOutputStream()

            try {
                while (isCapturing) {
                    val read = recorder.read(buffer, 0, buffer.size)
                    if (read > 0) {
                        pending.write(buffer, 0, read)

                        if (pending.size() >= chunkBytes) {
                            val pcm = pending.toByteArray()
                            pending.reset()
                            GeminiClient.transcribeMeetingChunk(pcm, contextJson) { emit(it) }
                            updateNotification()
                        }
                    }
                }

                // Flush the tail so the final partial chunk is not lost. Under a second is noise.
                val tail = pending.toByteArray()
                if (tail.size > GeminiClient.SAMPLE_RATE * GeminiClient.BYTES_PER_SAMPLE) {
                    GeminiClient.transcribeMeetingChunk(tail, contextJson) { emit(it) }
                }
            } catch (e: Exception) {
                android.util.Log.e("MeetingCapture", "Capture loop failed", e)
                emit(GeminiClient.buildErrorEnvelope("Recording error: ${e.message}"))
            } finally {
                try {
                    recorder.stop()
                } catch (e: Exception) {
                    android.util.Log.w("MeetingCapture", "Recorder stop failed", e)
                }
                recorder.release()
                audioRecord = null
                isRunning = false
            }
        }
    }

    private fun stopCapture() {
        isCapturing = false
        captureThread?.join(1500)
        captureThread = null
        releaseWakeLock()
    }

    /**
     * Android 14+ requires an explicit microphone service type, and refuses the promotion
     * if RECORD_AUDIO is not already granted.
     */
    private fun startForegroundWithType() {
        val notification = buildNotification("Recording - transcribing every ${chunkSeconds}s")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun buildNotification(text: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPending = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopPending = PendingIntent.getService(
            this, 1,
            Intent(this, MeetingCaptureService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Meeting recording in progress")
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentPending)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPending)
            .build()
    }

    private fun updateNotification() {
        val elapsed = (System.currentTimeMillis() - startedAtMs) / 1000
        val text = "Recording - %02d:%02d elapsed".format(elapsed / 60, elapsed % 60)
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, buildNotification(text))
        } catch (e: Exception) {
            android.util.Log.w("MeetingCapture", "Notification update failed", e)
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Meeting Recording",
                NotificationManager.IMPORTANCE_LOW // silent: this is a status, not an alert
            ).apply {
                description = "Shown while a meeting is being recorded and transcribed"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    /**
     * A microphone foreground service keeps the process alive but does not by itself keep the
     * CPU awake once the device dozes. Without this, capture stalls minutes after screen-off.
     */
    private fun acquireWakeLock() {
        if (wakeLock != null) return
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ccos:meeting-capture").apply {
                setReferenceCounted(false)
                acquire(4 * 60 * 60 * 1000L) // 4h ceiling so a leak can never drain the battery
            }
        } catch (e: Exception) {
            android.util.Log.w("MeetingCapture", "Wake lock unavailable", e)
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (e: Exception) {
            android.util.Log.w("MeetingCapture", "Wake lock release failed", e)
        }
        wakeLock = null
    }

    override fun onDestroy() {
        stopCapture()
        isRunning = false
        super.onDestroy()
    }
}
