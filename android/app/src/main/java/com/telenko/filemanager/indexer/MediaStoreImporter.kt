package com.telenko.filemanager.indexer

import android.content.Context
import android.provider.MediaStore
import io.objectbox.Box
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MediaStoreImporter(
    private val context: Context,
    private val fileIndexBox: Box<FileIndexEntity>
) {

    companion object {
        private const val BATCH_SIZE = 1000
    }

    suspend fun importAllMedia(
        onProgress: ((importedCount: Int) -> Unit)? = null
    ): Int = withContext(Dispatchers.IO) {
        var totalImported = 0

        // 1. Зображення
        totalImported += importCategory(
            contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            mediaType = MediaType.IMAGE,
            onProgress = onProgress,
            currentTotal = totalImported
        )

        // 2. Відео
        totalImported += importCategory(
            contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            mediaType = MediaType.VIDEO,
            onProgress = onProgress,
            currentTotal = totalImported
        )

        // 3. Музика / Аудіо
        totalImported += importCategory(
            contentUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            mediaType = MediaType.MUSIC,
            onProgress = onProgress,
            currentTotal = totalImported
        )

        return@withContext totalImported
    }

    private fun importCategory(
        contentUri: android.net.Uri,
        mediaType: MediaType,
        onProgress: ((importedCount: Int) -> Unit)?,
        currentTotal: Int
    ): Int {
        val projection = arrayOf(
            MediaStore.MediaColumns.DATA,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.DATE_MODIFIED,
            MediaStore.MediaColumns.SIZE
        )

        val cursor = context.contentResolver.query(
            contentUri,
            projection,
            null,
            null,
            null
        ) ?: return 0

        val buffer = ArrayList<FileIndexEntity>(BATCH_SIZE)
        var categoryImported = 0

        cursor.use { c ->
            val dataColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DATA)
            val nameColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
            val dateColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED)
            val sizeColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)

            while (c.moveToNext()) {
                val filePath = c.getString(dataColumn) ?: continue
                
                // ⚡ Оптимізація 1: Робота зі строками замість java.io.File
                val fileName = c.getString(nameColumn) ?: filePath.substringAfterLast('/')
                val parentPath = filePath.substringBeforeLast('/', "")
                
                val lastModified = c.getLong(dateColumn) * 1000L
                val fileSize = c.getLong(sizeColumn)

                val entity = FileIndexEntity(
                    filePath = filePath,
                    fileName = fileName,
                    mediaType = mediaType,
                    lastModified = lastModified,
                    fileSize = fileSize,
                    parentPath = parentPath
                )

                buffer.add(entity)

                if (buffer.size >= BATCH_SIZE) {
                    // ⚡ Оптимізація 2: Атомарний запис транзакції (1 сповіщення спостерігачам)
                    fileIndexBox.put(buffer)
                    categoryImported += buffer.size
                    onProgress?.invoke(currentTotal + categoryImported)
                    buffer.clear()
                }
            }

            if (buffer.isNotEmpty()) {
                fileIndexBox.put(buffer)
                categoryImported += buffer.size
                onProgress?.invoke(currentTotal + categoryImported)
                buffer.clear()
            }
        }

        return categoryImported
    }
}