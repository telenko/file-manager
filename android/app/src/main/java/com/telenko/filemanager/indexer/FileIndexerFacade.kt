package com.telenko.filemanager.indexer

import android.content.Context
import io.objectbox.query.QueryBuilder
import io.objectbox.Box
import io.objectbox.query.QueryBuilder.StringOrder
import io.objectbox.kotlin.inValues
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.File
import android.util.Log
import com.telenko.filemanager.indexer.FileIndexEntity_
import kotlin.time.measureTimedValue

class FileIndexerFacade private constructor(
    private val context: Context,
    private val fileIndexBox: Box<FileIndexEntity>
) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val mediaImporter = MediaStoreImporter(context, fileIndexBox)
    private val documentScanner = DocumentScanner(fileIndexBox)
    private val liveIndexManager = LiveIndexManager(context, fileIndexBox, mediaImporter)

    private var syncJob: Job? = null

    companion object {
        @Volatile
        private var INSTANCE: FileIndexerFacade? = null

        fun getInstance(context: Context, box: Box<FileIndexEntity>): FileIndexerFacade {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: FileIndexerFacade(context.applicationContext, box).also { INSTANCE = it }
            }
        }
    }

    /**
     * Запуск лінивої синхронізації при старті додатка + активація live observers.
     */
    fun startIndexing(onProgress: ((status: String, count: Int) -> Unit)? = null) {
        liveIndexManager.startListening()

        syncJob?.cancel()
        // ⚠️ ОБОВ'ЯЗКОВО перевірте, чи запуск йде на Dispatchers.IO!
        syncJob = scope.launch(Dispatchers.IO) { 
            var finalMediaCount = 0
            
            // Вимірюємо MediaStore
            val (_, mediaTime) = measureTimedValue {
                mediaImporter.importAllMedia { count ->
                    finalMediaCount = count
                    // onProgress?.invoke("IMPORTING_MEDIA", count)
                }
            }
            Log.d("Benchmark", "⏱️ [MediaImporter]: $mediaTime, $finalMediaCount")
            // 🏁 Івент завершення імпорту медіа
            onProgress?.invoke("MEDIA_COMPLETE", finalMediaCount)

            // Вимірюємо Документи
            var finalDocsCount = 0
            val (_, docsTime) = measureTimedValue {
                val rootDir = File("/storage/emulated/0")
                documentScanner.scanDocuments(rootDir) { docCount ->
                    finalDocsCount = docCount
                    // onProgress?.invoke("SCANNING_DOCUMENTS", docCount)
                }
            }
            Log.d("Benchmark", "⏱️ [DocumentScanner]: $docsTime, $finalDocsCount")
            // 🏁 Івент завершення сканування документів
            onProgress?.invoke("DOCUMENTS_COMPLETE", finalDocsCount)
        }
    }

    fun stopIndexing() {
        syncJob?.cancel()
        liveIndexManager.stopListening()
    }

    // --- Публічне API для внутрішнього використання в додатку ---

    /**
     * Точкове додавання/оновлення одного файла (наприклад, після завантаження PDF з мережі).
     */
    fun indexFile(filePath: String) {
        scope.launch {
            val file = File(filePath)
            if (!file.exists() || !file.isFile) return@launch

            val mediaType = if (DocumentResolver.isDocument(file)) {
                MediaType.TEXT
            } else {
                MediaTypeResolver.resolve(file)
            }

            if (mediaType != MediaType.OTHER) {
                val entity = FileIndexEntity(
                    filePath = file.absolutePath,
                    fileName = file.name,
                    mediaType = mediaType,
                    lastModified = file.lastModified(),
                    fileSize = file.length(),
                    parentPath = file.parent ?: ""
                )
                fileIndexBox.put(entity)
            }
        }
    }

    /**
     * Реіндексація конкретної папки.
     */
    fun indexDirectory(dirPath: String) {
        scope.launch {
            val dir = File(dirPath)
            if (dir.exists() && dir.isDirectory) {
                documentScanner.scanDocuments(dir)
            }
        }
    }

    /**
     * Видалення файла з індексу.
     */
    fun removeFile(filePath: String) {
        scope.launch {
            fileIndexBox.query()
                .equal(FileIndexEntity_.filePath, filePath, StringOrder.CASE_SENSITIVE)
                .build()
                .remove()
        }
    }

    fun getIndexedCount(): Int {
        return fileIndexBox.count().toInt()
    }

    /**
    * Отримання списку файлів за МАСИВОМ типів медіа з сортуванням від найновіших до найстаріших.
    * Наприклад: mediaTypes = ["IMAGE", "VIDEO"]
    */
    fun getFilesByMediaTypes(mediaTypes: List<String>?, limit: Long = 0): List<FileIndexEntity> {
        val queryBuilder = fileIndexBox.query()

        if (!mediaTypes.isNullOrEmpty() && !mediaTypes.contains("ALL")) {
            val validTypes: Array<String> = mediaTypes.map { it.uppercase() }.toTypedArray()
            
            if (validTypes.isNotEmpty()) {
                // Прямий виклик через генератор ObjectBox для StringArray
                queryBuilder.inValues(
                    FileIndexEntity_.mediaType,
                    validTypes,
                    StringOrder.CASE_SENSITIVE
                )
            }
        }

        // Сортування: найновіші першими
        queryBuilder.orderDesc(FileIndexEntity_.lastModified)

        val query = queryBuilder.build()
        return if (limit > 0) query.find(0, limit) else query.find()
    }
}