package com.telenko.filemanager.indexer

import com.telenko.filemanager.infiniteapi.MediaType
import com.telenko.filemanager.infiniteapi.MediaTypeResolver
import io.objectbox.Box
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import java.io.File
import android.util.Log


class DocumentScanner(
    private val fileIndexBox: Box<FileIndexEntity>,
    private val stateBox: Box<IndexerStateEntity>
) {

    companion object {
        private const val BATCH_SIZE = 500
        private val IGNORED_DIRS = setOf("Android", "DCIM", "Pictures", "Movies", "Music", "Podcasts")
    }

    suspend fun scanDocuments(
        rootDirectory: File,
        isFirstScan: Boolean
    ): Int = withContext(Dispatchers.IO) {
        if (!rootDirectory.exists() || !rootDirectory.isDirectory) return@withContext 0

        val state = stateBox.get(1) ?: IndexerStateEntity()
        val lastSavedDate = if (isFirstScan) 0L else state.documentLastModifiedDate
        var maxObservedDate = lastSavedDate

        val buffer = ArrayList<FileIndexEntity>(BATCH_SIZE)
        var totalIndexed = 0

        rootDirectory.walkTopDown()
            .onEnter { dir ->
                val name = dir.name
                !name.startsWith(".") && !IGNORED_DIRS.contains(name)
            }
            .filter { file -> 
                file.isFile && 
                !file.name.startsWith(".") && 
                (isFirstScan || file.lastModified() > lastSavedDate)
            }
            .forEach { file ->
                if (!coroutineContext.isActive) return@withContext totalIndexed

                if (MediaTypeResolver.isDocument(file)) {
                    val fileLastModified = file.lastModified()
                    if (fileLastModified > maxObservedDate) {
                        maxObservedDate = fileLastModified
                    }

                    val entity = FileIndexEntity(
                        filePath = file.absolutePath,
                        fileName = file.name,
                        mediaType = MediaType.TEXT,
                        lastModified = fileLastModified,
                        fileSize = file.length(),
                        parentPath = file.parent ?: ""
                    )
                    buffer.add(entity)

                    if (buffer.size >= BATCH_SIZE) {
                        fileIndexBox.put(buffer)
                        totalIndexed += buffer.size
                        buffer.clear()
                    }
                }
            }

        if (buffer.isNotEmpty()) {
            fileIndexBox.put(buffer)
            totalIndexed += buffer.size
            buffer.clear()
        }

        if (maxObservedDate > state.documentLastModifiedDate) {
            state.documentLastModifiedDate = maxObservedDate
            stateBox.put(state)
        }

        return@withContext totalIndexed
    }
}