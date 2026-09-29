package com.telenko.filemanager.indexer

import android.os.Build
import android.os.FileObserver
import java.io.File

class DocumentFileObserver(
    private val targetDirectory: File,
    private val onFileEvent: (event: Int, path: String) -> Unit
) {

    private var fileObserver: FileObserver? = null

    @Suppress("DEPRECATION")
    fun start() {
        if (!targetDirectory.exists() || !targetDirectory.isDirectory) return

        val mask = FileObserver.CREATE or 
                   FileObserver.DELETE or 
                   FileObserver.MODIFY or 
                   FileObserver.MOVED_FROM or 
                   FileObserver.MOVED_TO

        fileObserver = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            object : FileObserver(targetDirectory, mask) {
                override fun onEvent(event: Int, path: String?) {
                    path?.let { onFileEvent(event, "$targetDirectory/$it") }
                }
            }
        } else {
            object : FileObserver(targetDirectory.absolutePath, mask) {
                override fun onEvent(event: Int, path: String?) {
                    path?.let { onFileEvent(event, "$targetDirectory/$it") }
                }
            }
        }

        fileObserver?.startWatching()
    }

    fun stop() {
        fileObserver?.stopWatching()
        fileObserver = null
    }
}