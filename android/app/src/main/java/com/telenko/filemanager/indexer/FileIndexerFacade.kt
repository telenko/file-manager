package com.telenko.filemanager.indexer

import android.content.Context
import android.os.SystemClock
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
        private const val GARBAGE_COLLECTION_BATCH_SIZE = 100
        private const val GARBAGE_COLLECTION_CURSOR = "garbage_collection_cursor"
        private const val GARBAGE_COLLECTION_PREFS = "file_indexer"

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

    fun startIndexing(onEvent: ((IndexerEvent) -> Unit)? = null) {
        Log.d(TAG, "startIndexing called")
        liveIndexManager.stopListening()
        liveIndexManager.startListening { event ->
            if (event.name == "SCAN_REMOVE" && !event.removedPaths.isNullOrEmpty()) {
                forceRemoveIndex(
                    event.removedPaths,
                    onEvent,
                    onError = { error ->
                        Log.e(TAG, "Failed to remove detected paths from index", error)
                    }
                )
            } else {
                onEvent?.invoke(event)
            }
        }
        importFiles(onEvent)
    }

    fun importFiles(onEvent: ((IndexerEvent) -> Unit)? = null) {
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

                    onEvent?.invoke(IndexerEvent("SCAN_COMPLETE", count = totalCount))
                } else {
                    onEvent?.invoke(IndexerEvent("SCAN_RESYNC", count = totalCount))
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

    fun forceRemoveIndex(
        paths: List<String>,
        onEvent: ((IndexerEvent) -> Unit)? = null,
        onError: ((error: Exception) -> Unit)? = null
    ) {
        scope.launch(Dispatchers.IO) {
            try {
                val normalizedPaths = paths
                    .map { File(it).absolutePath.trimEnd(File.separatorChar) }
                    .distinct()
                val entitiesToRemove = normalizedPaths.flatMap { path ->
                    val exactMatch = fileIndexBox.query()
                        .equal(FileIndexEntity_.filePath, path, StringOrder.CASE_SENSITIVE)
                        .build()
                        .find()
                    val descendants = fileIndexBox.query()
                        .startsWith(
                            FileIndexEntity_.filePath,
                            "$path${File.separator}",
                            StringOrder.CASE_SENSITIVE
                        )
                        .build()
                        .find()
                    exactMatch + descendants
                }.distinctBy { it.id }

                if (entitiesToRemove.isNotEmpty()) {
                    fileIndexBox.remove(entitiesToRemove)
                }
                onEvent?.invoke(IndexerEvent("SCAN_REMOVE", removedPaths = normalizedPaths))
            } catch (e: Exception) {
                Log.e(TAG, "forceRemoveIndex: Failed to remove paths from index", e)
                onError?.invoke(e)
            }
        }
    }

    fun verifyFilesExist(
        paths: List<String>,
        onEvent: ((IndexerEvent) -> Unit)? = null,
        onComplete: ((checkedCount: Int, removedCount: Int) -> Unit)? = null,
        onError: ((error: Exception) -> Unit)? = null
    ) {
        scope.launch(Dispatchers.IO) {
            val startedAt = SystemClock.elapsedRealtime()
            try {
                val normalizedPaths = paths
                    .map { File(it).absolutePath }
                    .distinct()
                val removedPaths = normalizedPaths.filterNot { File(it).exists() }
                val removedEntities = removedPaths.flatMap { path ->
                    val query = fileIndexBox.query()
                        .equal(
                            FileIndexEntity_.filePath,
                            path,
                            StringOrder.CASE_SENSITIVE
                        )
                        .build()
                    try {
                        query.find()
                    } finally {
                        query.close()
                    }
                }.distinctBy { it.id }

                if (removedEntities.isNotEmpty()) {
                    fileIndexBox.remove(removedEntities)
                }
                if (removedPaths.isNotEmpty()) {
                    onEvent?.invoke(
                        IndexerEvent("SCAN_REMOVE", removedPaths = removedPaths)
                    )
                }

                onComplete?.invoke(normalizedPaths.size, removedPaths.size)
                Log.d(
                    TAG,
                    "verifyFilesExist: checked=${normalizedPaths.size}, " +
                        "removed=${removedPaths.size}, " +
                        "totalMs=${SystemClock.elapsedRealtime() - startedAt}"
                )
            } catch (e: Exception) {
                Log.e(TAG, "verifyFilesExist: Failed to verify indexed paths", e)
                onError?.invoke(e)
            }
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