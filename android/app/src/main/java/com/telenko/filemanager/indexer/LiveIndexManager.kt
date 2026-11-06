package com.telenko.filemanager.indexer

import android.content.Context
import android.os.FileObserver
import com.telenko.filemanager.infiniteapi.MediaTypeResolver
import io.objectbox.Box
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import android.util.Log


class LiveIndexManager(
    private val context: Context,
    private val fileIndexBox: Box<FileIndexEntity>,
    private val mediaStoreImporter: MediaStoreImporter
) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private var mediaDebounceJob: Job? = null
    private var mediaObserver: MediaContentObserver? = null
    private val documentObservers = mutableListOf<DocumentFileObserver>()

    fun startListening(onEvent: ((IndexerEvent) -> Unit)? = null) {
        // Реєстрація у фоновому потоці IO
        scope.launch(Dispatchers.IO) {
            // 1. Старт спостерігача MediaStore
            mediaObserver = MediaContentObserver(context) { _ ->
                Log.d("MediaStoreImporter", "detected a change in media")
                mediaDebounceJob?.cancel()
                mediaDebounceJob = scope.launch(Dispatchers.IO) {
                    delay(2000)
                    // Імпортуємо лише нові файли, які з'явилися після збереженої дати
                    mediaStoreImporter.importMedia(isFirstScan = false)
                    onEvent?.invoke(IndexerEvent("SCAN_RESYNC", count = 1))
                }
            }
            mediaObserver?.register()

            // 2. Старт спостерігачів для директорій документів
            val documentDirs = listOf(
                File("/storage/emulated/0/Download"),
                File("/storage/emulated/0/Documents")
            )

            documentDirs.forEach { dir ->
                if (dir.exists()) {
                    val observer = DocumentFileObserver(dir) { event, filePath ->
                        val fileEvent = event and FileObserver.ALL_EVENTS
                        val isRemoval = fileEvent == FileObserver.DELETE ||
                            fileEvent == FileObserver.MOVED_FROM
                        handleDocumentEvent(event, filePath, onEvent)
                        if (!isRemoval) {
                            onEvent?.invoke(IndexerEvent("SCAN_RESYNC", count = 1))
                        }
                    }
                    observer.start()
                    documentObservers.add(observer)
                }
            }
        }
    }

    fun stopListening() {
        mediaDebounceJob?.cancel()
        mediaDebounceJob = null
        mediaObserver?.unregister()
        mediaObserver = null
        documentObservers.forEach { it.stop() }
        documentObservers.clear()
    }

    private fun handleDocumentEvent(
        event: Int,
        filePath: String,
        onEvent: ((IndexerEvent) -> Unit)?
    ) {
        val file = File(filePath)
        
        when (event and FileObserver.ALL_EVENTS) {
            FileObserver.CREATE, FileObserver.MODIFY, FileObserver.MOVED_TO -> {
                if (file.isFile && MediaTypeResolver.isDocument(file)) {
                    val entity = FileIndexEntity(
                        filePath = file.absolutePath,
                        fileName = file.name,
                        mediaType = MediaTypeResolver.resolve(file),
                        lastModified = file.lastModified(),
                        fileSize = file.length(),
                        parentPath = file.parent ?: ""
                    )
                    fileIndexBox.put(entity) // Завдяки @Unique оновиться або створиться
                }
            }
            FileObserver.DELETE, FileObserver.MOVED_FROM -> {
                onEvent?.invoke(
                    IndexerEvent("SCAN_REMOVE", removedPaths = listOf(filePath))
                )
            }
        }
    }

}