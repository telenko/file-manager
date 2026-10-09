package com.telenko.filemanager.indexer

import android.content.Context
import com.telenko.filemanager.infiniteapi.MediaType
import com.telenko.filemanager.infiniteapi.MediaTypeResolver
import com.telenko.filemanager.infiniteapi.PagedFileRepository
import com.telenko.filemanager.infiniteapi.UiFileEntity
import io.objectbox.Box
import io.objectbox.query.QueryBuilder.StringOrder
import io.objectbox.kotlin.inValues
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.File

class FileIndexerFacade private constructor(
    private val context: Context,
    private val fileIndexBox: Box<FileIndexEntity>,
    private val stateBox: Box<IndexerStateEntity>
) : PagedFileRepository {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val mediaImporter = MediaStoreImporter(context, fileIndexBox, stateBox)
    private val documentScanner = DocumentScanner(fileIndexBox, stateBox)
    private val liveIndexManager = LiveIndexManager(context, fileIndexBox, mediaImporter)

    private var syncJob: Job? = null

    companion object {
        @Volatile
        private var INSTANCE: FileIndexerFacade? = null

        fun getInstance(
            context: Context, 
            box: Box<FileIndexEntity>,
            stateBox: Box<IndexerStateEntity>
        ): FileIndexerFacade {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: FileIndexerFacade(context.applicationContext, box, stateBox).also { INSTANCE = it }
            }
        }
    }

    fun startIndexing(onEvent: ((eventName: String, count: Int) -> Unit)? = null) {
        liveIndexManager.startListening(onEvent)
        importFiles(onEvent)
        // syncJob?.cancel()
        // syncJob = scope.launch(Dispatchers.IO) {
        //     val state = stateBox.get(1) ?: IndexerStateEntity()
        //     val isFirstScan = !state.isFirstScanCompleted

        //     val mediaCount = mediaImporter.importMedia(isFirstScan)
        //     val rootDir = File("/storage/emulated/0")
        //     val docsCount = documentScanner.scanDocuments(rootDir, isFirstScan)

        //     val totalCount = mediaCount + docsCount

        //     if (isFirstScan) {
        //         val updatedState = stateBox.get(1) ?: IndexerStateEntity()
        //         updatedState.isFirstScanCompleted = true
        //         stateBox.put(updatedState)

        //         onEvent?.invoke("SCAN_COMPLETE", totalCount)
        //     } else {
        //         onEvent?.invoke("SCAN_RESYNC", totalCount)
        //     }
        // }
    }

    fun importFiles(onEvent: ((eventName: String, count: Int) -> Unit)? = null) {
        syncJob?.cancel()
        syncJob = scope.launch(Dispatchers.IO) {
            val state = stateBox.get(1) ?: IndexerStateEntity()
            val isFirstScan = !state.isFirstScanCompleted

            val mediaCount = mediaImporter.importMedia(isFirstScan)
            val rootDir = File("/storage/emulated/0")
            val docsCount = documentScanner.scanDocuments(rootDir, isFirstScan)

            val totalCount = mediaCount + docsCount

            if (isFirstScan) {
                val updatedState = stateBox.get(1) ?: IndexerStateEntity()
                updatedState.isFirstScanCompleted = true
                stateBox.put(updatedState)

                onEvent?.invoke("SCAN_COMPLETE", totalCount)
            } else {
                onEvent?.invoke("SCAN_RESYNC", totalCount)
            }
        }
    }

    fun stopIndexing() {
        syncJob?.cancel()
        liveIndexManager.stopListening()
    }

    fun indexFile(filePath: String) {
        scope.launch {
            val file = File(filePath)
            if (!file.exists() || !file.isFile) return@launch

            val mediaType = MediaTypeResolver.resolve(file)
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

    fun indexDirectory(dirPath: String) {
        scope.launch {
            val dir = File(dirPath)
            if (dir.exists() && dir.isDirectory) {
                documentScanner.scanDocuments(dir, isFirstScan = false)
            }
        }
    }

    fun removeFile(filePath: String) {
        scope.launch {
            fileIndexBox.query()
                .equal(FileIndexEntity_.filePath, filePath, StringOrder.CASE_SENSITIVE)
                .build()
                .remove()
        }
    }

    // --- Реалізація PagedFileRepository для infiniteapi ---

    override fun getFilesPaged(
        mediaTypes: List<MediaType>?, 
        offset: Long, 
        pageSize: Int
    ): List<UiFileEntity> {
        val queryBuilder = fileIndexBox.query()

        if (!mediaTypes.isNullOrEmpty()) {
            val typeNames = mediaTypes.map { it.name }.toTypedArray()
            queryBuilder.inValues(
                FileIndexEntity_.mediaType,
                typeNames,
                StringOrder.CASE_SENSITIVE
            )
        }

        queryBuilder.orderDesc(FileIndexEntity_.lastModified)

        val query = queryBuilder.build()
        val entities = query.find(offset, pageSize.toLong())

        return entities.map { entity ->
            UiFileEntity(
                filePath = entity.filePath,
                lastModified = entity.lastModified,
                mediaType = entity.mediaType
            )
        }
    }
}