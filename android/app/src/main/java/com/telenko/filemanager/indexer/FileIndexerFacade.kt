package com.telenko.filemanager.indexer

import android.content.Context
import android.os.SystemClock
import android.util.Log
import com.telenko.filemanager.db.ObjectBoxStore
import com.telenko.filemanager.infiniteapi.MediaType
import com.telenko.filemanager.infiniteapi.MediaTypeResolver
import com.telenko.filemanager.infiniteapi.PagedFileRepository
import com.telenko.filemanager.infiniteapi.UiFileEntity
import com.telenko.filemanager.search.SearchIndexWorkScheduler
import io.objectbox.Box
import io.objectbox.query.QueryBuilder.StringOrder
import io.objectbox.kotlin.inValues
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import kotlin.math.abs

enum class SearchIndexMarkResult {
    UPDATED,
    ENTITY_MISSING,
    CHANGED_DURING_INDEXING
}

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
    private var liveSearchIndexEnqueueJob: Job? = null

    companion object {
        private const val TAG = "FileIndexerFacade"
        private const val GARBAGE_COLLECTION_BATCH_SIZE = 100
        private const val GARBAGE_COLLECTION_CURSOR = "garbage_collection_cursor"
        private const val GARBAGE_COLLECTION_PREFS = "file_indexer"
        private const val LIVE_SEARCH_INDEX_DEBOUNCE_MS = 500L
        private const val SEARCH_INDEX_PAGE_SIZE = 200

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

        fun getInstance(context: Context): FileIndexerFacade {
            val store = ObjectBoxStore.get(context.applicationContext)
            return getInstance(
                context,
                store.boxFor(FileIndexEntity::class.java),
                store.boxFor(IndexerStateEntity::class.java)
            )
        }
    }

    fun countAllIndexes(): Long = fileIndexBox.count()

    fun countPendingSearchIndexes(): Long = countSearchIndexes(::isPending)

    fun countCompletedSearchIndexes(): Long = countSearchIndexes {
        it.searchTimeStamp?.let { timestamp -> timestamp >= it.lastModified } == true
    }

    fun getSearchIndexPage(offset: Long): List<FileIndexEntity> {
        val query = fileIndexBox.query().build()
        return try {
            query.find(offset, SEARCH_INDEX_PAGE_SIZE.toLong())
        } finally {
            query.close()
        }
    }

    fun isPendingSearchIndex(entity: FileIndexEntity): Boolean = isPending(entity)

    fun searchIndexPercentage(indexedCount: Long, totalCount: Long): Int =
        if (totalCount == 0L) 100 else ((indexedCount * 100) / totalCount).toInt().coerceIn(0, 100)

    fun markSearchIndexCompleted(
        entity: FileIndexEntity,
        timestampToleranceMs: Long
    ): SearchIndexMarkResult {
        val current = fileIndexBox.get(entity.id) ?: return SearchIndexMarkResult.ENTITY_MISSING
        val file = File(current.filePath)
        val isFile = file.isFile
        val fileLastModified = if (isFile) file.lastModified() else null
        val databaseTimestampChanged = current.lastModified != entity.lastModified
        val fileTimestampDifferenceMs = fileLastModified?.let { abs(it - entity.lastModified) }
        val fileTimestampChanged = fileTimestampDifferenceMs == null ||
            fileTimestampDifferenceMs > timestampToleranceMs

        if (databaseTimestampChanged || !isFile || fileTimestampChanged) {
            Log.d(
                TAG,
                "Skipping changed file after search indexing: id=${entity.id}, path=${entity.filePath}, " +
                    "databaseTimestampChanged=$databaseTimestampChanged, " +
                    "storedLastModified=${entity.lastModified}, " +
                    "currentLastModified=${current.lastModified}, isFile=$isFile, " +
                    "fileLastModified=${fileLastModified ?: "unavailable"}, " +
                    "fileTimestampDifferenceMs=${fileTimestampDifferenceMs ?: "unavailable"}, " +
                    "allowedDifferenceMs=$timestampToleranceMs"
            )
            return SearchIndexMarkResult.CHANGED_DURING_INDEXING
        }

        current.searchTimeStamp = System.currentTimeMillis()
        fileIndexBox.put(current)
        return SearchIndexMarkResult.UPDATED
    }

    private fun countSearchIndexes(predicate: (FileIndexEntity) -> Boolean): Long {
        val query = fileIndexBox.query().build()
        try {
            var offset = 0L
            var matchingCount = 0L
            val totalCount = query.count()
            while (offset < totalCount) {
                val rows = query.find(offset, SEARCH_INDEX_PAGE_SIZE.toLong())
                if (rows.isEmpty()) break
                matchingCount += rows.count(predicate)
                offset += rows.size
            }
            return matchingCount
        } finally {
            query.close()
        }
    }

    private fun isPending(entity: FileIndexEntity): Boolean =
        entity.searchTimeStamp?.let { it < entity.lastModified } ?: true

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
                if (event.name == "SCAN_RESYNC" && event.count?.let { it > 0 } == true) {
                    liveSearchIndexEnqueueJob?.cancel()
                    liveSearchIndexEnqueueJob = scope.launch {
                        delay(LIVE_SEARCH_INDEX_DEBOUNCE_MS)
                        SearchIndexWorkScheduler.enqueue(context, appendIfRunning = true)
                    }
                }
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
            SearchIndexWorkScheduler.enqueue(context)
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

                IndexRemovalEventBridge.emit(
                    IndexRemovalEvent(
                        paths = (entitiesToRemove.map { it.filePath } + normalizedPaths).distinct()
                    )
                )
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

                if (removedPaths.isNotEmpty()) {
                    IndexRemovalEventBridge.emit(
                        IndexRemovalEvent(
                            paths = (removedEntities.map { it.filePath } + removedPaths).distinct()
                        )
                    )
                }
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