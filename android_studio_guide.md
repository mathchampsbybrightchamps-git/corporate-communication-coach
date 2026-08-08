# Communication Coach — Android Studio Setup & Kotlin Deployment Guide

* **Document ID**: doc_android_studio_kotlin_guide
* **Version**: 1.0 (Active)
* **Last Modified**: 2026-08-08T05:57:49+05:30
* **Status**: Deployed
* **Author**: Antigravity Coding Assistant

---

## 1. Overview
This guide details the compilation of the **Communication Coach - For Corporates** PWA code into a native Android application package using **Kotlin-only** templates in Android Studio.

---

## 2. Step-by-Step Android Studio Setup

### Step 1: Create a Kotlin Project
1. Open **Android Studio**.
2. Click **New Project** $\rightarrow$ **Empty Views Activity** (or **Empty Activity**).
3. Set project configurations:
   * **Name**: `CorporateCommunicationCoach`
   * **Package Name**: `com.communicationcoach.fluxsy`
   * **Language**: `Kotlin`
   * **Minimum SDK**: `API 23: Android 6.0`

---

### Step 2: Create the Assets Folder
1. Switch the project explorer panel view from **Android** to **Project**.
2. Navigate to: `app` $\rightarrow$ `src` $\rightarrow$ `main`.
3. Right-click `main` $\rightarrow$ **New** $\rightarrow$ **Folder** $\rightarrow$ **Assets Folder**.
4. Save the folder. This creates `app/src/main/assets/`.

---

### Step 3: Copy Frontend Source Files
Copy the static assets into the assets folder:
```text
app/src/main/assets/
├── brand_system/
├── permissions/
├── start_screens/
├── app.js
├── index.css
├── index.html
├── manifest.json
└── sw.js
```

---

### Step 4: Configure AndroidManifest.xml
Open `app/src/main/AndroidManifest.xml` and insert the permission filters and activity configuration:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- App Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.CorporateCommunicationCoach">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
```

---

### Step 5: Program MainActivity.kt (Kotlin)
Open `app/src/main/java/com/communicationcoach/fluxsy/MainActivity.kt` and replace its content with the full-screen WebView and hardware permission requests:
```kotlin
package com.communicationcoach.fluxsy

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var myWebView: WebView
    private val PERMISSION_REQUEST_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Load dynamically to prevent layout constraint issues
        myWebView = WebView(this)
        setContentView(myWebView)

        val webSettings = myWebView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true

        myWebView.webViewClient = WebViewClient()
        
        // Grant permissions inside WebView Chrome Client
        myWebView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources)
            }
        }

        // Request runtime permissions on launch
        requestHardwarePermissions()

        // Load the local PWA app assets
        myWebView.loadUrl("file:///android_asset/index.html")
    }

    private fun requestHardwarePermissions() {
        val permissions = arrayOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION
        )

        var needsRequest = false
        for (perm in permissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true
                break
            }
        }

        if (needsRequest) {
            ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE)
        }
    }
}
```

---

### Step 6: Compile and Run
1. In Android Studio, select your active **Android Emulator** or connected **Android Device**.
2. Click the green **Run** button (`Shift + F10`).
3. The app will compile using Kotlin dependencies and start on your target device!
