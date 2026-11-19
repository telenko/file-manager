package com.telenko.filemanager.search

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import com.telenko.filemanager.indexer.IndexRemovalEvent
import com.telenko.filemanager.indexer.IndexRemovalEventBridge
import com.telenko.filemanager.search.common.ExtractionResult
import com.telenko.filemanager.search.common.SearchIndexer
import com.telenko.filemanager.search.common.MediaType
import com.telenko.filemanager.search.common.AndroidTokenizer
import com.telenko.filemanager.search.snapshot.FileTextSnapshotEntity
import com.telenko.filemanager.search.snapshot.FileTextSnapshotEntity_
import com.telenko.filemanager.search.snapshot.PdfEmbeddingIndexer
import com.telenko.filemanager.search.snapshot.TextEmbeddingIndexer
import com.telenko.filemanager.search.embeddings.FileEmbeddingEntity
import com.telenko.filemanager.search.embeddings.FileEmbeddingEntity_
import com.telenko.filemanager.search.embeddings.ImageEmbeddingIndexer
import com.telenko.filemanager.search.embeddings.VideoEmbeddingIndexer
import io.objectbox.Box
import io.objectbox.query.QueryBuilder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import android.util.Log
import com.telenko.filemanager.db.ObjectBoxStore


private const val TAG = "FileSearchIndexer"

class FileSearchIndexer(
    context: Context,
    ortEnv: OrtEnvironment,
    visualSession: OrtSession?,
    textSession: OrtSession?,
    textTokenizer: AndroidTokenizer,
) {
    // 1. Ініціалізуємо менеджер збереження та пошуку у БД (ObjectBox)
    private val box: Box<FileEmbeddingEntity> = ObjectBoxStore.get(context).boxFor(FileEmbeddingEntity::class.java)
    private val snapshotBox: Box<FileTextSnapshotEntity> = ObjectBoxStore.get(context).boxFor(FileTextSnapshotEntity::class.java)

    // 2. Ініціалізуємо всі спеціалізовані індексатори
    val imageIndexer = ImageEmbeddingIndexer(ortEnv, visualSession)
    val videoIndexer = VideoEmbeddingIndexer(imageIndexer, visualSession)
    var textEmbeddingIndexer = TextEmbeddingIndexer(ortEnv, textSession, textTokenizer)
    val pdfIndexer = PdfEmbeddingIndexer(context)

    private val indexers: List<SearchIndexer> = listOf(
        imageIndexer,
        videoIndexer,
        pdfIndexer
    )

    private val removalEventsJob = CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
        IndexRemovalEventBridge.events.collect { event ->
            event.paths.forEach(::removeFileCache)
        }
    }

    private fun removeFileCache(filePath: String) {
        // 1. Видаляємо всі ембеддинги файлу прямо в БД (без завантаження у пам'ять)
        box.query()
            .equal(FileEmbeddingEntity_.filePath, filePath, QueryBuilder.StringOrder.CASE_SENSITIVE)
            .build()
            .remove()

        // 2. Видаляємо всі текстові знімки (snapshots)
        snapshotBox.query()
            .equal(FileTextSnapshotEntity_.filePath, filePath, QueryBuilder.StringOrder.CASE_SENSITIVE)
            .build()
            .remove()
    }

    private fun storeFileCache(embeddings: List<FileEmbeddingEntity>, snapshots: List<FileTextSnapshotEntity>) {
        if (embeddings.isNotEmpty()) {
            box.put(embeddings)
        }
        if (snapshots.isNotEmpty()) {
            snapshotBox.put(snapshots)
        }
    }

    /**
     * 3. Метод для індексації одного файлу.
     * Знаходить відповідний індексатор за розширенням файлу, витягує ембеддінги та зберігає їх у БД.
     */
    suspend fun indexFile(filePath: String): Boolean = withContext(Dispatchers.IO) {
        Log.d(TAG, "Indexing file: $filePath")
        val file = File(filePath)
        removeFileCache(filePath)
        if (!file.exists() || !file.isFile) return@withContext false
        // Знаходимо індексатор, який підтримує цей тип файлу
        val indexer = indexers.firstOrNull { it.supports(filePath) } ?: return@withContext true
        try {
            val (embeddings, snapshots) = indexer.indexFile(filePath)
            storeFileCache(embeddings, snapshots) 
            true
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Failed to index file: $filePath", e)
            false
        }
    }

}