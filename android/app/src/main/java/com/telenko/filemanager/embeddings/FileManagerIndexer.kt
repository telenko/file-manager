package com.telenko.filemanager.embeddings

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class FileManagerIndexer(
    context: Context,
    ortEnv: OrtEnvironment,
    visualSession: OrtSession?,
    textSession: OrtSession?,
    textTokenizer: AndroidTokenizer,
) {
    // 1. Ініціалізуємо менеджер збереження та пошуку у БД (ObjectBox)
    val vectorSearchManager = VectorSearchManager(context)

    // 2. Ініціалізуємо всі спеціалізовані індексатори
    val imageIndexer = ImageEmbeddingIndexer(ortEnv, visualSession)
    val videoIndexer = VideoEmbeddingIndexer(imageIndexer, visualSession)
    var textEmbeddingIndexer = TextEmbeddingIndexer(ortEnv, textSession, textTokenizer)
    val pdfIndexer = PdfEmbeddingIndexer(imageIndexer, textEmbeddingIndexer, visualSession)

    private val indexers: List<MediaEmbeddingIndexer> = listOf(
        imageIndexer,
        videoIndexer,
        pdfIndexer
    )

    /**
     * 3. Метод для індексації одного файлу.
     * Знаходить відповідний індексатор за розширенням файлу, витягує ембеддінги та зберігає їх у БД.
     */
    suspend fun indexFile(filePath: String): Boolean = withContext(Dispatchers.IO) {
        val file = File(filePath)
        if (!file.exists() || !file.isFile) return@withContext false

        // Знаходимо індексатор, який підтримує цей тип файлу
        val indexer = indexers.firstOrNull { it.supports(filePath) } ?: return@withContext false

        try {
            val extractedEmbeddings = indexer.indexFile(filePath)

            // Зберігаємо кожен отриманий вектор у VectorSearchManager
            for (extracted in extractedEmbeddings) {
                vectorSearchManager.upsertEmbedding(
                    filePath = file.absolutePath,
                    fileName = file.name,
                    vector = extracted.vector,
                    metadata = extracted.metadata
                )
            }
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
            val success = indexFile(file.absolutePath)
            if (success) {
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