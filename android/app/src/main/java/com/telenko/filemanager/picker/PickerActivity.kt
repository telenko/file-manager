package com.telenko.filemanager.picker

import android.os.Bundle
import com.facebook.react.ReactActivity
import android.app.Activity
import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class PickerActivity : ReactActivity() {

    override fun getMainComponentName(): String {
        return "FileManagerPicker"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    fun handleSend(targetDirPath: String) {
        if (intent == null) return

        when (intent.action) {
            Intent.ACTION_SEND -> {
                val fileUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                fileUri?.let {
                    saveFileFromUri(it, targetDirPath)
                }
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                val fileUris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                fileUris?.forEach { uri ->
                    saveFileFromUri(uri, targetDirPath)
                }
            }
            else -> {
                Log.d("MainActivity", "Unhandled intent action: ${intent.action}")
            }
        }
        finish()
    }

    // Helper method to save a single file from a URI to the specified directory
    private fun saveFileFromUri(uri: Uri, targetDirPath: String) {
        val contentResolver: ContentResolver = applicationContext.contentResolver

        // Get file name from URI or assign a default name
        val fileName = uri.lastPathSegment?.substringAfterLast('/') ?: "shared_file"

        try {
            val inputStream: InputStream? = contentResolver.openInputStream(uri)
            if (inputStream != null) {
                // Ensure target directory exists
                val targetDir = File(targetDirPath)
                if (!targetDir.exists()) targetDir.mkdirs()

                val targetFile = File(targetDir, fileName)
                FileOutputStream(targetFile).use { outputStream ->
                    inputStream.copyTo(outputStream)
                }
                Log.d("MainActivity", "File saved to: ${targetFile.absolutePath}")
            } else {
                Log.e("MainActivity", "Failed to open input stream for URI: $uri")
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Log.e("MainActivity", "Error saving file from URI: $uri", e)
        }
    }

}