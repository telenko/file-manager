package com.telenko.filemanager.embeddings

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import io.objectbox.Box
import io.objectbox.query.QueryBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import android.util.Log


private const val TAG = "FileManagerIndexer"

class FileManagerIndexer(
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

    private val indexers: List<MediaEmbeddingIndexer> = listOf(
        imageIndexer,
        videoIndexer,
        pdfIndexer
    )

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
        val file = File(filePath)
        removeFileCache(filePath)
        if (!file.exists() || !file.isFile) return@withContext false
        // Знаходимо індексатор, який підтримує цей тип файлу
        val indexer = indexers.firstOrNull { it.supports(filePath) } ?: return@withContext false
        try {
            val (embeddings, snapshots) = indexer.indexFile(filePath)
            storeFileCache(embeddings, snapshots) 
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * 4. Метод для індексації всієї папки.
     * 
     * @param folderPath Повний шлях до папки.
     * @param recursive Якщо true, індексуються також усі підпапки.
     * @param onProgress Опціональний колбек для відстеження прогресу (оброблено файлів, всього).
     */
    suspend fun indexFolder(
        folderPath: String,
        recursive: Boolean = true,
        onProgress: ((processed: Int, total: Int) -> Unit)? = null
    ): Int = withContext(Dispatchers.IO) {
        val folder = File(folderPath)
        if (!folder.exists() || !folder.isDirectory) return@withContext 0

        // Отримуємо список усіх файлів для індексації
        val filesToIndex = collectFiles(folder, recursive)
        var successfullyIndexedCount = 0

        filesToIndex.forEachIndexed { index, file ->
            val isSuccess = indexFile(file.absolutePath)
            if (isSuccess) {
                successfullyIndexedCount++
            }
            onProgress?.invoke(index + 1, filesToIndex.size)
        }

        successfullyIndexedCount
    }

    /**
     * Допоміжний метод для збору файлів у папці (і підпапках при recursive = true),
     * які підтримуються хоча б одним індексатором.
     */
    private fun collectFiles(folder: File, recursive: Boolean): List<File> {
        val resultList = mutableListOf<File>()

        val files = folder.listFiles() ?: return emptyList()

        for (file in files) {
            if (file.isDirectory && recursive) {
                resultList.addAll(collectFiles(file, recursive = true))
            } else if (file.isFile) {
                if (indexers.any { it.supports(file.absolutePath) }) {
                    resultList.add(file)
                }
            }
        }

        return resultList
    }
}