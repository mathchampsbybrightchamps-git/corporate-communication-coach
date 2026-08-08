package com.communicationcoach.fluxsy

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
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

class MainActivity : AppCompatActivity() {

    private lateinit var myWebView: WebView
    private val PERMISSION_REQUEST_CODE = 101
    private val CHANNEL_ID = "ccos_nudge_channel"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        supportActionBar?.hide()

        myWebView = WebView(this)
        setContentView(myWebView)

        val webSettings = myWebView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true

        myWebView.webViewClient = WebViewClient()
        
        myWebView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources)
            }
        }

        myWebView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        createNotificationChannel()
        requestHardwarePermissions()

        // State Retention: Restore WebView session if coming back from background recreation
        if (savedInstanceState != null) {
            myWebView.restoreState(savedInstanceState)
        } else {
            myWebView.loadUrl("file:///android_asset/index.html")
        }

        // Hardware Back Button Handler: Delegate to JS navigation history stack first
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                myWebView.evaluateJavascript(
                    "javascript:(function(){ if(CommCoach && CommCoach.Navigation){ return CommCoach.Navigation.goBack() ? 'handled' : 'exit'; } return 'exit'; })()"
                ) { result ->
                    val cleaned = result?.replace("\"", "") ?: "exit"
                    if (cleaned != "handled") {
                        // No JS history left, let the system handle (minimize or exit)
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        myWebView.saveState(outState)
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
            Manifest.permission.ACCESS_FINE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
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
                runOnUiThread {
                    myWebView.evaluateJavascript("javascript:$jsCallbackMethod('${escapeJsString(response)}')", null)
                }
            }
        }

        @JavascriptInterface
        fun verifyLinkedIn(jsCallbackMethod: String) {
            thread {
                Thread.sleep(1500)
                runOnUiThread {
                    val response = JSONObject().apply {
                        put("status", "pending")
                        put("message", "Profile submitted successfully.")
                    }
                    myWebView.evaluateJavascript("javascript:$jsCallbackMethod('${escapeJsString(response.toString())}')", null)
                }
            }
        }

        @JavascriptInterface
        fun launchPlayBilling(jsCallbackMethod: String) {
            thread {
                Thread.sleep(1000)
                runOnUiThread {
                    myWebView.evaluateJavascript("javascript:$jsCallbackMethod('success')", null)
                }
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

        /**
         * Save text content to local device storage.
         * Directory structure: Documents/CommunicationCoach/[YYYY-MM MonthName]/[DD-MonthName-YYYY]/
         * @param fileName  e.g. "Drill_SelfIntro_1430.txt"
         * @param content   The text content to save
         * @return          The absolute file path on success, or error message
         */
        @JavascriptInterface
        fun saveToFile(fileName: String, content: String): String {
            return try {
                val now = java.util.Calendar.getInstance()
                val monthNames = arrayOf("January","February","March","April","May","June",
                    "July","August","September","October","November","December")
                val year = now.get(java.util.Calendar.YEAR)
                val month = now.get(java.util.Calendar.MONTH)
                val day = now.get(java.util.Calendar.DAY_OF_MONTH)

                val monthFolder = "${year}-${String.format("%02d", month + 1)}_${monthNames[month]}"
                val dayFolder = "${String.format("%02d", day)}-${monthNames[month]}-${year}"

                // Use app-specific external storage (no special permission needed on Android 10+)
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

        /**
         * List all saved recording files for a given date or all dates.
         * @return JSON array string of file paths
         */
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

        private fun escapeJsString(str: String): String {
            return str.replace("\\", "\\\\")
                      .replace("'", "\\'")
                      .replace("\"", "\\\"")
                      .replace("\n", "\\n")
                      .replace("\r", "\\r")
        }
    }
}
