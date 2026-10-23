package com.telenko.filemanager.indexer

import android.content.Context
import android.util.Log
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
        private const val TAG = "FileIndexerFacade"

        @Volatile
        private var INSTANCE: FileIndexerFacade? = null

        fun getInstance(
            context: Context, 
            box: Box<FileIndexEntity>,
            stateBox: Box<IndexerStateEntity>
        ): FileIndexerFacade {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: FileIndexerFacade(context.applicationContext, box, stateBox).also { 
                    Log.d(TAG, "Initialized new instance of FileIndexerFacade")
                    INSTANCE = it 
                }
            }
        }
    }

    fun startIndexing(onEvent: ((eventName: String, count: Int) -> Unit)? = null) {
        Log.d(TAG, "startIndexing called")
        liveIndexManager.startListening(onEvent)
        importFiles(onEvent)
    }

    fun importFiles(onEvent: ((eventName: String, count: Int) -> Unit)? = null) {
        syncJob?.cancel()
        syncJob = scope.launch(Dispatchers.IO) {
            try {
                Log.d(TAG, "importFiles: Starting background indexing job...")
                val state = stateBox.get(1) ?: IndexerStateEntity().also {
                    Log.d(TAG, "importFiles: State entity ID 1 not found, created default.")
                }
                val isFirstScan = !state.isFirstScanCompleted
                Log.d(TAG, "importFiles: Is first scan? $isFirstScan")

                val mediaCount = mediaImporter.importMedia(isFirstScan)
                Log.d(TAG, "importFiles: Media files imported: $mediaCount")

                val rootDir = File("/storage/emulated/0")
                val docsCount = documentScanner.scanDocuments(rootDir, isFirstScan)
                Log.d(TAG, "importFiles: Documents scanned: $docsCount")

                val totalCount = mediaCount + docsCount
                Log.d(TAG, "importFiles: Total files processed: $totalCount")

                if (isFirstScan) {
                    val updatedState = stateBox.get(1) ?: IndexerStateEntity()
                    updatedState.isFirstScanCompleted = true
                    stateBox.put(updatedState)
                    Log.d(TAG, "importFiles: First scan completed flag saved to database.")

                    onEvent?.invoke("SCAN_COMPLETE", totalCount)
                } else {
                    onEvent?.invoke("SCAN_RESYNC", totalCount)
                }
            } catch (e: Exception) {
                Log.e(TAG, "importFiles: Error during indexing process", e)
            }
        }
    }

    fun stopIndexing() {
        Log.d(TAG, "stopIndexing called")
        syncJob?.cancel()
        liveIndexManager.stopListening()
    }

    fun indexFile(filePath: String) {
        scope.launch {
            val file = File(filePath)
            if (!file.exists() || !file.isFile) {
                Log.w(TAG, "indexFile: File does not exist or is not a file: $filePath")
                return@launch
            }

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
                Log.d(TAG, "indexFile: Successfully indexed file: ${file.absolutePath}")
            }
        }
    }

    fun indexDirectory(dirPath: String) {
        scope.launch {
            val dir = File(dirPath)
            if (dir.exists() && dir.isDirectory) {
                Log.d(TAG, "indexDirectory: Scanning directory: $dirPath")
                documentScanner.scanDocuments(dir, isFirstScan = false)
            } else {
                Log.w(TAG, "indexDirectory: Directory does not exist or is invalid: $dirPath")
            }
        }
    }

    fun removeFile(filePath: String) {
        scope.launch {
            Log.d(TAG, "removeFile: Removing file from index: $filePath")
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
        Log.d(TAG, "getFilesPaged: mediaTypes=$mediaTypes, offset=$offset, pageSize=$pageSize")
        
        val queryBuilder = fileIndexBox.query()

        if (!mediaTypes.isNullOrEmpty()) {
            val typeNames = mediaTypes.map { nativeType -> nativeType.name }.toTypedArray()
            queryBuilder.inValues(
                FileIndexEntity_.mediaType,
                typeNames,
                StringOrder.CASE_SENSITIVE
            )
        }

        queryBuilder.orderDesc(FileIndexEntity_.lastModified)

        val query = queryBuilder.build()
        val entities = query.find(offset, pageSize.toLong())
        
        Log.d(TAG, "getFilesPaged: Found ${entities.size} entities in database for offset $offset")

        return entities.map { entity ->
            UiFileEntity(
                filePath = entity.filePath,
                lastModified = entity.lastModified,
                mediaType = entity.mediaType
            )
        }
    }
}