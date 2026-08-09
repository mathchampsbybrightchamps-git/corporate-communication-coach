package com.communicationcoach.fluxsy

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.io.ByteArrayOutputStream
import kotlin.concurrent.thread
import org.json.JSONObject
import org.json.JSONArray
import java.util.Locale
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var myWebView: WebView
    private var textToSpeech: TextToSpeech? = null
    private val PERMISSION_REQUEST_CODE = 101
    private val CHANNEL_ID = "ccos_nudge_channel"

    // Name of the JS global that receives transcribed meeting chunks. Recording itself
    // lives in MeetingCaptureService so it survives screen lock.
    private var meetingCallbackMethod: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        supportActionBar?.hide()

        // Init native Android TextToSpeech engine
        textToSpeech = TextToSpeech(applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.language = Locale.US
            }
        }

        myWebView = WebView(this)
        setContentView(myWebView)

        val webSettings = myWebView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.mediaPlaybackRequiresUserGesture = false
        webSettings.allowFileAccessFromFileURLs = true
        webSettings.allowUniversalAccessFromFileURLs = true

        myWebView.webViewClient = WebViewClient()
        
        myWebView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    try {
                        request.grant(request.resources)
                    } catch (e: Exception) {
                        android.util.Log.e("CommCoachBridge", "Permission grant error", e)
                    }
                }
            }
        }

        myWebView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        createNotificationChannel()
        requestHardwarePermissions()

        // Handle native device back button press gracefully
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                myWebView.evaluateJavascript("javascript:if (CommCoach && CommCoach.Navigation) { CommCoach.Navigation.goBack(); } else { false; }") { result ->
                    if (result == "false" || result == "null") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        })

        // State Retention: Restore WebView session if coming back from background recreation
        if (savedInstanceState != null) {
            myWebView.restoreState(savedInstanceState)
        } else {
            myWebView.loadUrl("file:///android_asset/index.html")
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        myWebView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        // Replay anything the service transcribed while the screen was off or the UI was gone.
        if (meetingCallbackMethod != null) {
            attachMeetingListener()
        }
    }

    override fun onPause() {
        super.onPause()
        // Detach so results buffer instead of being pushed into a WebView that may be
        // suspended. They are flushed on the next onResume.
        MeetingCaptureService.listener = null
    }

    /**
     * Routes transcribed chunks into the WebView and drains anything buffered while the
     * UI was detached.
     */
    private fun attachMeetingListener() {
        val callback = meetingCallbackMethod ?: return

        MeetingCaptureService.listener = { result ->
            runOnUiThread { pushToJs(callback, result) }
        }

        MeetingCaptureService.drainPending().forEach { buffered ->
            runOnUiThread { pushToJs(callback, buffered) }
        }
    }

    /** Base64-hops a payload into a JS global, avoiding all string-escaping hazards. */
    private fun pushToJs(jsCallbackMethod: String, payload: String) {
        val b64 = android.util.Base64.encodeToString(
            payload.toByteArray(Charsets.UTF_8), android.util.Base64.NO_WRAP
        )
        myWebView.evaluateJavascript(
            "javascript:if (typeof window['$jsCallbackMethod'] === 'function') " +
                "{ window['$jsCallbackMethod'](decodeURIComponent(escape(atob('$b64')))); }",
            null
        )
    }

    override fun onDestroy() {
        MeetingCaptureService.listener = null

        if (textToSpeech != null) {
            textToSpeech?.stop()
            textToSpeech?.shutdown()
        }
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "CCOS Daily Reminders"
            val descriptionText = "Notification nudges to maintain communication streaks"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun requestHardwarePermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }

        var needsRequest = false
        for (perm in permissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true
                break
            }
        }

        if (needsRequest) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    // Javascript Interface Bridge class
    inner class AndroidBridge {

        @JavascriptInterface
        fun speakText(text: String, langCode: String) {
            runOnUiThread {
                try {
                    val locale = when (langCode.lowercase()) {
                        "hi" -> Locale("hi", "IN")
                        "bn" -> Locale("bn", "BD")
                        "te" -> Locale("te", "IN")
                        "ta" -> Locale("ta", "IN")
                        "ur" -> Locale("ur", "PK")
                        "ar" -> Locale("ar", "SA")
                        "fr" -> Locale("fr", "FR")
                        "es" -> Locale("es", "ES")
                        "de" -> Locale("de", "DE")
                        "zh" -> Locale("zh", "CN")
                        "ja" -> Locale("ja", "JP")
                        "ko" -> Locale("ko", "KR")
                        "ru" -> Locale("ru", "RU")
                        "pt" -> Locale("pt", "BR")
                        "mr" -> Locale("mr", "IN")
                        "gu" -> Locale("gu", "IN")
                        "kn" -> Locale("kn", "IN")
                        "ml" -> Locale("ml", "IN")
                        "pa" -> Locale("pa", "IN")
                        "it" -> Locale("it", "IT")
                        "nl" -> Locale("nl", "NL")
                        "pl" -> Locale("pl", "PL")
                        "tr" -> Locale("tr", "TR")
                        "vi" -> Locale("vi", "VN")
                        "th" -> Locale("th", "TH")
                        "id" -> Locale("id", "ID")
                        "sv" -> Locale("sv", "SE")
                        "he" -> Locale("he", "IL")
                        else -> Locale.US
                    }
                    textToSpeech?.language = locale
                    textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "CCOS_TTS_ID")
                } catch (e: Exception) {
                    android.util.Log.e("CommCoachBridge", "TTS speak error", e)
                }
            }
        }

        @JavascriptInterface
        fun captureFrameAndProcess(targetLang: String, jsCallbackMethod: String) {
            runOnUiThread {
                try {
                    val width = myWebView.width
                    val height = myWebView.height
                    if (width <= 0 || height <= 0) return@runOnUiThread

                    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    val canvas = android.graphics.Canvas(bitmap)
                    myWebView.draw(canvas)

                    // Crop center reticle box area (top 10% to 55%)
                    val startY = (height * 0.10).toInt()
                    val boxHeight = (height * 0.45).toInt()
                    val startX = (width * 0.05).toInt()
                    val boxWidth = (width * 0.90).toInt()

                    val croppedBitmap = Bitmap.createBitmap(bitmap, startX, startY, boxWidth, boxHeight)
                    
                    // Ultra-fast scale down for sub-millisecond encoding & instant vision processing
                    val scaleWidth = 480
                    val scaleHeight = (boxHeight * (480.0 / boxWidth)).toInt()
                    val scaledBitmap = Bitmap.createScaledBitmap(croppedBitmap, scaleWidth, scaleHeight, true)

                    val byteArrayOutputStream = ByteArrayOutputStream()
                    scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 70, byteArrayOutputStream)
                    val byteArray = byteArrayOutputStream.toByteArray()
                    val base64Image = android.util.Base64.encodeToString(byteArray, android.util.Base64.NO_WRAP)

                    processOCRImage(base64Image, targetLang, jsCallbackMethod)
                } catch (e: Exception) {
                    android.util.Log.e("CommCoachBridge", "Native frame capture error", e)
                }
            }
        }

        @JavascriptInterface
        fun saveStats(drills: Int, quizzes: Int, streak: Int, language: String, level: String) {
            val json = JSONObject().apply {
                put("fields", JSONObject().apply {
                    put("totalDrills", JSONObject().put("integerValue", drills))
                    put("totalQuizzes", JSONObject().put("integerValue", quizzes))
                    put("streak", JSONObject().put("integerValue", streak))
                    put("language", JSONObject().put("stringValue", language))
                    put("level", JSONObject().put("stringValue", level))
                })
            }

            val url = "https://firestore.googleapis.com/v1/projects/corporate-comm-coach/databases/(default)/documents/users/sample_user_id"
            GeminiClient.post(url, json.toString()) { response ->
                android.util.Log.d("CommCoachBridge", "Firestore REST Response: $response")
            }
        }

        /**
         * Reports whether a Gemini API key was compiled into the build, so the web layer
         * can show an actionable message instead of failing silently.
         */
        @JavascriptInterface
        fun isAiConfigured(): Boolean = OpenAIClient.isConfigured() || GeminiClient.isConfigured()

        @JavascriptInterface
        fun getAICoaching(prompt: String, jsCallbackMethod: String) {
            if (OpenAIClient.isConfigured()) {
                OpenAIClient.generateText(prompt) { response ->
                    sendBase64ToJs(jsCallbackMethod, response)
                }
            } else {
                val partsArray = JSONArray().apply {
                    put(JSONObject().put("text", prompt))
                }
                val contentsArray = JSONArray().apply {
                    put(JSONObject().put("parts", partsArray))
                }
                val json = JSONObject().apply {
                    put("contents", contentsArray)
                }

                GeminiClient.post(GeminiClient.ENDPOINT, json.toString()) { response ->
                    sendBase64ToJs(jsCallbackMethod, response)
                }
            }
        }

        @JavascriptInterface
        fun processOCRImage(base64Data: String, targetLang: String, jsCallbackMethod: String) {
            if (OpenAIClient.isConfigured()) {
                OpenAIClient.processVisionOCR(base64Data, targetLang) { response ->
                    sendBase64ToJs(jsCallbackMethod, response)
                }
                return
            }

            try {
                val cleanBase64 = if (base64Data.contains(",")) base64Data.split(",")[1] else base64Data
                
                // Decode & Auto-compress large images to max 1024x1024 to prevent Vision API timeouts
                val decodedBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT)
                val originalBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)

                val compressedBase64 = if (originalBitmap != null && (originalBitmap.width > 1024 || originalBitmap.height > 1024)) {
                    val maxDim = 1024
                    val ratio = Math.min(maxDim.toDouble() / originalBitmap.width, maxDim.toDouble() / originalBitmap.height)
                    val targetW = (originalBitmap.width * ratio).toInt()
                    val targetH = (originalBitmap.height * ratio).toInt()

                    val resized = Bitmap.createScaledBitmap(originalBitmap, targetW, targetH, true)
                    val stream = ByteArrayOutputStream()
                    resized.compress(Bitmap.CompressFormat.JPEG, 70, stream)
                    android.util.Base64.encodeToString(stream.toByteArray(), android.util.Base64.NO_WRAP)
                } else {
                    cleanBase64
                }

                val promptText = "Perform high accuracy OCR text extraction on this image. Extract all readable text present in the image word for word. Then translate the extracted text into target language code '$targetLang'. Respond in JSON format: {\"detected\":\"[Exact extracted original text]\",\"translated\":\"[Translation in $targetLang]\"}"
                
                val partsArray = JSONArray().apply {
                    put(JSONObject().put("text", promptText))
                    put(JSONObject().put("inline_data", JSONObject().apply {
                        put("mime_type", "image/jpeg")
                        put("data", compressedBase64)
                    }))
                }

                val contentsArray = JSONArray().apply {
                    put(JSONObject().put("parts", partsArray))
                }

                val json = JSONObject().apply {
                    put("contents", contentsArray)
                }

                GeminiClient.post(GeminiClient.ENDPOINT, json.toString()) { response ->
                    sendBase64ToJs(jsCallbackMethod, response)
                }
            } catch (e: Exception) {
                android.util.Log.e("CommCoachBridge", "OCR Image Compression Error", e)
                val errObj = JSONObject().apply {
                    put("detected", "Image processing error. Please try taking another photo.")
                    put("translated", "Error translating image.")
                }
                sendBase64ToJs(jsCallbackMethod, errObj.toString())
            }
        }

        /**
         * Supplies the running speaker roster and language hints. Read by the capture
         * service when building each chunk's prompt, so speaker labels stay consistent.
         */
        @JavascriptInterface
        fun updateMeetingContext(contextJson: String) {
            MeetingCaptureService.contextJson = contextJson
        }

        /**
         * Starts meeting capture in a foreground service so recording survives screen lock
         * and app backgrounding. Results arrive at [jsCallbackMethod] as each chunk completes.
         */
        @JavascriptInterface
        fun startMeetingCapture(chunkSeconds: Int, jsCallbackMethod: String) {
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED
            ) {
                sendBase64ToJs(jsCallbackMethod, GeminiClient.buildErrorEnvelope("Microphone permission denied."))
                return
            }

            if (!GeminiClient.isConfigured()) {
                sendBase64ToJs(jsCallbackMethod, GeminiClient.buildErrorEnvelope(
                    "Gemini API key missing. Add GEMINI_API_KEY to local.properties and rebuild."
                ))
                return
            }

            meetingCallbackMethod = jsCallbackMethod
            attachMeetingListener()

            val intent = Intent(this@MainActivity, MeetingCaptureService::class.java).apply {
                action = MeetingCaptureService.ACTION_START
                putExtra(MeetingCaptureService.EXTRA_CHUNK_SECONDS, chunkSeconds)
            }
            ContextCompat.startForegroundService(this@MainActivity, intent)
        }

        @JavascriptInterface
        fun stopMeetingCapture() {
            val intent = Intent(this@MainActivity, MeetingCaptureService::class.java).apply {
                action = MeetingCaptureService.ACTION_STOP
            }
            try {
                startService(intent)
            } catch (e: Exception) {
                android.util.Log.w("CommCoachBridge", "Stop capture failed", e)
            }
        }

        /** True when the service is still recording, e.g. after the UI was recreated. */
        @JavascriptInterface
        fun isMeetingCaptureRunning(): Boolean = MeetingCaptureService.isRunning

        @JavascriptInterface
        fun verifyLinkedIn(jsCallbackMethod: String) {
            thread {
                Thread.sleep(1500)
                val response = JSONObject().apply {
                    put("status", "pending")
                    put("message", "Profile submitted successfully.")
                }
                sendBase64ToJs(jsCallbackMethod, response.toString())
            }
        }

        @JavascriptInterface
        fun launchPlayBilling(jsCallbackMethod: String) {
            thread {
                Thread.sleep(1000)
                sendBase64ToJs(jsCallbackMethod, "success")
            }
        }

        @JavascriptInterface
        fun showLocalNotification(title: String, message: String) {
            runOnUiThread {
                val builder = NotificationCompat.Builder(this@MainActivity, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setAutoCancel(true)

                try {
                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
                } catch (e: SecurityException) {
                    android.util.Log.e("CommCoachBridge", "Post notification security exception", e)
                }
            }
        }

        @JavascriptInterface
        fun saveToFile(fileName: String, content: String): String {
            return try {
                val calendar = java.util.Calendar.getInstance()
                val year = calendar.get(java.util.Calendar.YEAR)
                val month = calendar.get(java.util.Calendar.MONTH)
                val day = calendar.get(java.util.Calendar.DAY_OF_MONTH)

                val monthNames = arrayOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
                val monthFolder = monthNames[month]
                val dayFolder = "${String.format("%02d", day)}-${monthNames[month]}-${year}"

                val baseDir = getExternalFilesDir(android.os.Environment.DIRECTORY_DOCUMENTS)
                val targetDir = java.io.File(baseDir, "CommunicationCoach/$monthFolder/$dayFolder")

                if (!targetDir.exists()) {
                    targetDir.mkdirs()
                }

                // Add unique timestamp & UUID to prevent file naming collisions (Issue 11)
                val namePart = fileName.substringBeforeLast(".")
                val extPart = fileName.substringAfterLast(".", "txt")
                val uuidSuffix = UUID.randomUUID().toString().take(6)
                val uniqueFileName = "${namePart}_${uuidSuffix}.$extPart"

                val file = java.io.File(targetDir, uniqueFileName)
                file.writeText(content, Charsets.UTF_8)

                android.util.Log.d("CommCoachBridge", "File saved: ${file.absolutePath}")
                file.absolutePath
            } catch (e: Exception) {
                android.util.Log.e("CommCoachBridge", "File save failed", e)
                "ERROR: ${e.message}"
            }
        }

        @JavascriptInterface
        fun listSavedFiles(): String {
            return try {
                val baseDir = getExternalFilesDir(android.os.Environment.DIRECTORY_DOCUMENTS)
                val coachDir = java.io.File(baseDir, "CommunicationCoach")
                val files = mutableListOf<String>()

                if (coachDir.exists()) {
                    coachDir.walkTopDown().forEach { file ->
                        if (file.isFile) {
                            files.add(file.absolutePath)
                        }
                    }
                }

                org.json.JSONArray(files).toString()
            } catch (e: Exception) {
                "[]"
            }
        }

        private fun sendBase64ToJs(jsCallbackMethod: String, responseText: String) {
            val b64 = android.util.Base64.encodeToString(responseText.toByteArray(Charsets.UTF_8), android.util.Base64.NO_WRAP)
            runOnUiThread {
                myWebView.evaluateJavascript("javascript:if (typeof window['$jsCallbackMethod'] === 'function') { window['$jsCallbackMethod'](decodeURIComponent(escape(atob('$b64')))); }", null)
            }
        }

    }
}
