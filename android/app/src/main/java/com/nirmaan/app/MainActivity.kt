package com.nirmaan.app

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1001

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.setSupportMultipleWindows(false)
        settings.userAgentString = settings.userAgentString + " NIRMAAN_Android_App/2.0"

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("https://me-eight-dun.vercel.app") || url.startsWith("http://localhost")) {
                    return false
                }
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(intent)
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "audio/*"
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }

        val appUrl = intent?.data?.toString() ?: "https://me-eight-dun.vercel.app"
        webView.loadUrl(appUrl)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (fileUploadCallback == null) return
            val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            fileUploadCallback?.onReceiveValue(results)
            fileUploadCallback = null
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
