package com.telenko.filemanager.indexer

import io.objectbox.Box
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import java.io.File

class DocumentScanner(
    private val fileIndexBox: Box<FileIndexEntity>
) {

    companion object {
        private const val BATCH_SIZE = 500
        // Папки, які слід ігнорувати для збереження ресурсів та батареї
        private val IGNORED_DIRS = setOf("Android", "DCIM", "Pictures", "Movies", "Music", "Podcasts")
    }

    /**
     * Сканує вказану папку (або весь накопичувач) лише на наявність текстових/PDF документів.
     */
    suspend fun scanDocuments(
        rootDirectory: File,
        onProgress: ((indexedCount: Int) -> Unit)? = null
    ): Int = withContext(Dispatchers.IO) {
        if (!rootDirectory.exists() || !rootDirectory.isDirectory) return@withContext 0

        val buffer = ArrayList<FileIndexEntity>(BATCH_SIZE)
        var totalIndexed = 0

        rootDirectory.walkTopDown()
            .onEnter { dir ->
                val name = dir.name
                // Не заходимо в приховані папки та відомі медіа-директорії (бо їх закриває MediaStoreImporter)
                !name.startsWith(".") && !IGNORED_DIRS.contains(name)
            }
            .filter { file -> file.isFile && !file.name.startsWith(".") }
            .forEach { file ->
                // Перевірка на зупинку корутини (наприклад, за сигналом Battery Monitor)
                if (!coroutineContext.isActive) return@withContext totalIndexed

                if (DocumentResolver.isDocument(file)) {
                    val entity = FileIndexEntity(
                        filePath = file.absolutePath,
                        fileName = file.name,
                        mediaType = MediaType.TEXT,
                        lastModified = file.lastModified(),
                        fileSize = file.length(),
                        parentPath = file.parent ?: ""
                    )
                    buffer.add(entity)

                    if (buffer.size >= BATCH_SIZE) {
                        fileIndexBox.put(buffer)
                        totalIndexed += buffer.size
                        onProgress?.invoke(totalIndexed)
                        buffer.clear()
                    }
                }
            }

        // Записуємо залишок з буфера
        if (buffer.isNotEmpty()) {
            fileIndexBox.put(buffer)
            totalIndexed += buffer.size
            onProgress?.invoke(totalIndexed)
            buffer.clear()
        }

        return@withContext totalIndexed
    }
}