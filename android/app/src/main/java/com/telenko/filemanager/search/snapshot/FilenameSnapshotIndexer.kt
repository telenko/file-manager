package com.telenko.filemanager.search.snapshot

import com.telenko.filemanager.infiniteapi.MediaType
import com.telenko.filemanager.infiniteapi.MediaTypeResolver
import com.telenko.filemanager.search.common.ExtractionResult
import com.telenko.filemanager.search.common.SearchIndexer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class FilenameSnapshotIndexer : SearchIndexer {

    override val mediaType: MediaType = MediaType.OTHER

    override fun supports(filePath: String): Boolean {
        val file = File(filePath)
        val resolvedType = MediaTypeResolver.resolve(file)
        return resolvedType != MediaType.IMAGE && resolvedType != MediaType.VIDEO
    }

    override suspend fun indexFile(filePath: String): ExtractionResult =
        withContext(Dispatchers.IO) {
            val file = File(filePath)
            val cleanFileName = extractCleanFileName(file.name)
            if (!file.exists() || !file.isFile || cleanFileName.isBlank()) {
                return@withContext ExtractionResult(emptyList(), emptyList())
            }

            val snapshot = FileTextSnapshotEntity(
                filePath = filePath,
                fileName = file.name,
                pageIndex = -1,
                text = cleanFileName,
                mediaType = MediaTypeResolver.resolve(file).name,
                snapshotType = SnapshotType.FILE_NAME.name
            )

            ExtractionResult(
                embeddings = emptyList(),
                snapshots = listOf(snapshot)
            )
        }

    private fun extractCleanFileName(fileNameWithExtension: String): String {
        val nameWithoutExtension = fileNameWithExtension.substringBeforeLast('.')
        return nameWithoutExtension
            .replace("[_\\-\\.\\,\\;\\:\\/\\\\|]+".toRegex(), " ")
            .split("\\s+".toRegex())
            .filter { it.isNotBlank() }
            .joinToString(" ")
    }
}
