package com.yoyo.fitness

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var appInterface: WebAppInterface? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Keep screen on during fitness testing
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        requestWirelessPermissions()

        webView = findViewById(R.id.webView)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        configureWebView()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Load Svelte application via WebViewAssetLoader
        webView.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.addJavascriptInterface(WebAppInterface(this).also { appInterface = it }, "Android")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                super.onReceivedError(view, request, error)
                Log.w("YoYoWebView", "Web error: ${error.description} at ${request.url}")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d("YoYoApp", "[JS] ${consoleMessage.message()} (${consoleMessage.sourceId()}:${consoleMessage.lineNumber()})")
                return true
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        appInterface?.shutdownSync()
        appInterface = null
        webView.destroy()
        super.onDestroy()
    }

    private fun requestWirelessPermissions() {
        val needed = mutableListOf<String>()
        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            needed.add(android.Manifest.permission.ACCESS_FINE_LOCATION)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (checkSelfPermission(android.Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.BLUETOOTH_SCAN)
            }
            if (checkSelfPermission(android.Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.BLUETOOTH_ADVERTISE)
            }
            if (checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.BLUETOOTH_CONNECT)
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(android.Manifest.permission.NEARBY_WIFI_DEVICES) != PackageManager.PERMISSION_GRANTED
        ) {
            needed.add(android.Manifest.permission.NEARBY_WIFI_DEVICES)
        }
        if (needed.isNotEmpty()) {
            requestPermissions(needed.toTypedArray(), REQUEST_WIRELESS)
        }
    }

    companion object {
        private const val REQUEST_WIRELESS = 1001
    }

    class WebAppInterface(private val activity: MainActivity) {
        private val prefs = activity.getSharedPreferences("yoyo_prefs", Context.MODE_PRIVATE)
        private val nearby = NearbySyncManager(activity)
        private val foundTablets = ConcurrentHashMap<String, String>()

        @JavascriptInterface
        fun showToast(message: String) {
            activity.runOnUiThread {
                Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun vibrate(milliseconds: Long) {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            vibrator?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    it.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    it.vibrate(milliseconds)
                }
            }
        }

        @JavascriptInterface
        fun setKeepScreenOn(keepOn: Boolean) {
            activity.runOnUiThread {
                if (keepOn) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        }

        @JavascriptInterface
        fun getLocalIps(): String {
            val ips = mutableListOf<String>()
            try {
                val interfaces = NetworkInterface.getNetworkInterfaces()
                while (interfaces.hasMoreElements()) {
                    val networkInterface = interfaces.nextElement()
                    if (networkInterface.isLoopback || !networkInterface.isUp) continue
                    val addresses = networkInterface.inetAddresses
                    while (addresses.hasMoreElements()) {
                        val address = addresses.nextElement()
                        if (address is Inet4Address) {
                            ips.add(address.hostAddress)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("YoYoInterface", "Failed to query IP addresses", e)
            }
            if (ips.isEmpty()) {
                ips.add("127.0.0.1")
            }
            return JSONArray(ips).toString()
        }

        @JavascriptInterface
        fun saveData(key: String, value: String) {
            prefs.edit().putString(key, value).apply()
        }

        @JavascriptInterface
        fun loadData(key: String): String? {
            return prefs.getString(key, null)
        }

        // --- Nearby Connections tablet/phone sync ---
        // Tablet hosts (advertises); phones discover, connect, receive live
        // state and send back miss/eliminate actions. No hotspot or IP entry needed.

        @JavascriptInterface
        fun startHosting(): String {
            try {
                nearby.startHosting()
            } catch (e: SecurityException) {
                throw RuntimeException("Nearby needs location/Bluetooth permissions. Please grant them and retry.")
            } catch (e: Exception) {
                Log.e("YoYoInterface", "startHosting failed", e)
                throw RuntimeException("Could not start hosting: ${e.message}")
            }
            return "OK"
        }

        @JavascriptInterface
        fun stopHosting() {
            try {
                nearby.stopHosting()
            } catch (e: Exception) {
                Log.e("YoYoInterface", "stopHosting failed", e)
            }
        }

        @JavascriptInterface
        fun broadcastTestState(stateJson: String) {
            nearby.broadcastState(stateJson)
        }

        @JavascriptInterface
        fun broadcastCommandResult(resultJson: String) {
            nearby.broadcastResult(resultJson)
        }

        @JavascriptInterface
        fun popRemoteActions(): String {
            return JSONArray(nearby.drainActions()).toString()
        }

        @JavascriptInterface
        fun connectedPhoneCount(): Int {
            return nearby.connectedPhoneCount()
        }

        @JavascriptInterface
        fun startTabletDiscovery(): String {
            foundTablets.clear()
            try {
                nearby.startDiscovery(object : NearbySyncManager.DiscoveryListener {
                    override fun onEndpointFound(endpointId: String, name: String) {
                        foundTablets[endpointId] = name
                    }

                    override fun onEndpointLost(endpointId: String) {
                        foundTablets.remove(endpointId)
                    }
                })
            } catch (e: SecurityException) {
                throw RuntimeException("Nearby needs location/Bluetooth permissions. Please grant them and retry.")
            } catch (e: Exception) {
                Log.e("YoYoInterface", "startTabletDiscovery failed", e)
                throw RuntimeException("Discovery failed: ${e.message}")
            }
            return "OK"
        }

        @JavascriptInterface
        fun stopTabletDiscovery() {
            try {
                nearby.stopDiscovery()
            } catch (e: Exception) {
                Log.e("YoYoInterface", "stopTabletDiscovery failed", e)
            }
        }

        @JavascriptInterface
        fun getFoundTablets(): String {
            val arr = JSONArray()
            for ((id, name) in foundTablets) {
                arr.put(JSONObject().put("id", id).put("name", name))
            }
            return arr.toString()
        }

        @JavascriptInterface
        fun connectTablet(endpointId: String): String {
            val latch = CountDownLatch(1)
            var ok = false
            var message = "Timed out."
            nearby.connectToTablet(endpointId, object : NearbySyncManager.ConnectionListener {
                override fun onResult(id: String, success: Boolean, msg: String) {
                    ok = success
                    message = msg
                    latch.countDown()
                }
            })
            latch.await(20, TimeUnit.SECONDS)
            if (!ok) throw RuntimeException("Could not connect: $message")
            return "OK"
        }

        @JavascriptInterface
        fun getRemoteState(): String {
            return nearby.latestRemoteState
        }

        @JavascriptInterface
        fun sendRemoteAction(actionJson: String) {
            try {
                nearby.sendAction(actionJson)
            } catch (e: IllegalStateException) {
                throw RuntimeException("Not connected to the tablet.")
            } catch (e: Exception) {
                Log.e("YoYoInterface", "sendRemoteAction failed", e)
                throw RuntimeException("Could not send: ${e.message}")
            }
        }

        @JavascriptInterface
        fun sendRemoteCommand(commandJson: String) {
            try {
                nearby.sendRemoteCommand(commandJson)
            } catch (e: IllegalStateException) {
                throw RuntimeException("Not connected to the tablet.")
            } catch (e: Exception) {
                Log.e("YoYoInterface", "sendRemoteCommand failed", e)
                throw RuntimeException("Could not send command: ${e.message}")
            }
        }

        @JavascriptInterface
        fun popRemoteResults(): String {
            return JSONArray(nearby.drainResults()).toString()
        }

        @JavascriptInterface
        fun disconnectTablet() {
            try {
                nearby.disconnectTablet()
            } catch (e: Exception) {
                Log.e("YoYoInterface", "disconnectTablet failed", e)
            }
            foundTablets.clear()
        }

        @JavascriptInterface
        fun shutdownSync() {
            try {
                nearby.stopHosting()
            } catch (_: Exception) {
            }
            try {
                nearby.disconnectTablet()
            } catch (_: Exception) {
            }
            foundTablets.clear()
        }
    }
}
