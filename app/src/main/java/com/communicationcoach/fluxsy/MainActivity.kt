package com.communicationcoach.fluxsy

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
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
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread
import org.json.JSONObject
import org.json.JSONArray
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var myWebView: WebView
    private var textToSpeech: TextToSpeech? = null
    private val PERMISSION_REQUEST_CODE = 101
    private val CHANNEL_ID = "ccos_nudge_channel"

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

    override fun onDestroy() {
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
                        "es" -> Locale("es", "ES")
                        "fr" -> Locale("fr", "FR")
                        "de" -> Locale("de", "DE")
                        "ja" -> Locale("ja", "JP")
                        "zh" -> Locale("zh", "CN")
                        "ar" -> Locale("ar", "SA")
                        "ru" -> Locale("ru", "RU")
                        "pt" -> Locale("pt", "BR")
                        "it" -> Locale("it", "IT")
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
            sendPostRequest(url, json.toString()) { response ->
                android.util.Log.d("CommCoachBridge", "Firestore REST Response: $response")
            }
        }

        @JavascriptInterface
        fun getAICoaching(prompt: String, jsCallbackMethod: String) {
            val json = JSONObject().apply {
                put("contents", JSONObject().apply {
                    put("parts", JSONObject().put("text", prompt))
                })
            }

            val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            sendPostRequest(url, json.toString()) { response ->
                sendBase64ToJs(jsCallbackMethod, response)
            }
        }

        @JavascriptInterface
        fun processOCRImage(base64Data: String, targetLang: String, jsCallbackMethod: String) {
            val cleanBase64 = if (base64Data.contains(",")) base64Data.split(",")[1] else base64Data
            val promptText = "Extract all text present in this image. Translate the extracted text into target language code '$targetLang'. Return JSON: {\"detected\":\"[Extracted text]\",\"translated\":\"[Translated text]\"}"
            
            val partsArray = JSONArray().apply {
                put(JSONObject().put("text", promptText))
                put(JSONObject().put("inline_data", JSONObject().apply {
                    put("mime_type", "image/jpeg")
                    put("data", cleanBase64)
                }))
            }

            val contentsArray = JSONArray().apply {
                put(JSONObject().put("parts", partsArray))
            }

            val json = JSONObject().apply {
                put("contents", contentsArray)
            }

            val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            sendPostRequest(url, json.toString()) { response ->
                sendBase64ToJs(jsCallbackMethod, response)
            }
        }

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

                val file = java.io.File(targetDir, fileName)
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

        private fun sendPostRequest(urlStr: String, jsonBody: String, callback: (String) -> Unit) {
            thread {
                try {
                    val url = URL(urlStr)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    conn.doOutput = true
                    
                    val os = conn.outputStream
                    val writer = OutputStreamWriter(os, "UTF-8")
                    writer.write(jsonBody)
                    writer.flush()
                    writer.close()
                    os.close()

                    val responseCode = conn.responseCode
                    val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
                    val responseText = stream.bufferedReader().use { it.readText() }
                    callback(responseText)
                } catch (e: Exception) {
                    callback("Exception: ${e.message}")
                }
            }
        }
    }
}
