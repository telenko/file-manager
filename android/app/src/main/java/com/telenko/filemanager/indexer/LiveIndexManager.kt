package com.telenko.filemanager.indexer

import android.content.Context
import android.os.FileObserver
import io.objectbox.Box
import io.objectbox.query.QueryBuilder.StringOrder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

class LiveIndexManager(
    private val context: Context,
    private val fileIndexBox: Box<FileIndexEntity>,
    private val mediaStoreImporter: MediaStoreImporter
) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private var mediaDebounceJob: Job? = null
    private var mediaObserver: MediaContentObserver? = null
    private val documentObservers = mutableListOf<DocumentFileObserver>()

    fun startListening() {
        // Виконуємо ВСЮ реєстрацію у фоновому потоці IO, щоб не блокувати Main Thread
        scope.launch(Dispatchers.IO) {
            // 1. Старт спостерігача MediaStore
            mediaObserver = MediaContentObserver(context) {
                mediaDebounceJob?.cancel()
                // Переконуємося, що debounce працює строго на Dispatchers.IO
                mediaDebounceJob = scope.launch(Dispatchers.IO) {
                    delay(2000)
                    // 💡 ПРИМІТКА: Тут краще імпортувати тільки останні зміни, 
                    // а не робити повний re-import усіх 10k файлів!
                    mediaStoreImporter.importAllMedia()
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
                        handleDocumentEvent(event, filePath)
                    }
                    observer.start()
                    documentObservers.add(observer)
                }
            }
        }
    }

    fun stopListening() {
        mediaObserver?.unregister()
        mediaObserver = null
        documentObservers.forEach { it.stop() }
        documentObservers.clear()
    }

    private fun handleDocumentEvent(event: Int, filePath: String) {
        val file = File(filePath)
        
        when (event and FileObserver.ALL_EVENTS) {
            FileObserver.CREATE, FileObserver.MODIFY, FileObserver.MOVED_TO -> {
                if (file.isFile && DocumentResolver.isDocument(file)) {
                    val entity = FileIndexEntity(
                        filePath = file.absolutePath,
                        fileName = file.name,
                        mediaType = MediaType.TEXT,
                        lastModified = file.lastModified(),
                        fileSize = file.length(),
                        parentPath = file.parent ?: ""
                    )
                    fileIndexBox.put(entity) // Завдяки @Unique запис оновиться або створиться
                }
            }
            FileObserver.DELETE, FileObserver.MOVED_FROM -> {
                // Миттєве видалення з індексу за шляхом
                fileIndexBox.query()
                    .equal(FileIndexEntity_.filePath, filePath, StringOrder.CASE_SENSITIVE)
                    .build()
                    .remove()
            }
        }
    }
}