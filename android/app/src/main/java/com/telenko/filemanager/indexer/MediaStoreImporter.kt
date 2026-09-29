package com.telenko.filemanager.indexer

import android.content.Context
import android.provider.MediaStore
import com.telenko.filemanager.infiniteapi.MediaType
import io.objectbox.Box
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.util.Log

class MediaStoreImporter(
    private val context: Context,
    private val fileIndexBox: Box<FileIndexEntity>,
    private val stateBox: Box<IndexerStateEntity>
) {

    companion object {
        private const val BATCH_SIZE = 1000
    }

    suspend fun importMedia(isFirstScan: Boolean): Int = withContext(Dispatchers.IO) {
        val state = stateBox.get(1) ?: IndexerStateEntity()
        val lastSavedDate = if (isFirstScan) 0L else state.mediaLastModifiedDate
        var maxObservedDate = lastSavedDate

        var totalImported = 0
        val categories = listOf(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI to MediaType.IMAGE,
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI to MediaType.VIDEO,
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI to MediaType.MUSIC
        )

        for ((uri, type) in categories) {
            val (imported, maxDate) = importCategory(
                contentUri = uri,
                mediaType = type,
                afterDateSeconds = lastSavedDate / 1000L
            )
            totalImported += imported
            if (maxDate > maxObservedDate) {
                maxObservedDate = maxDate
            }
        }

        if (maxObservedDate > state.mediaLastModifiedDate) {
            state.mediaLastModifiedDate = maxObservedDate
            stateBox.put(state)
        }

        return@withContext totalImported
    }

    private fun importCategory(
        contentUri: android.net.Uri,
        mediaType: MediaType,
        afterDateSeconds: Long
    ): Pair<Int, Long> {
        val projection = arrayOf(
            MediaStore.MediaColumns.DATA,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.DATE_MODIFIED,
            MediaStore.MediaColumns.SIZE
        )

        val selection = if (afterDateSeconds > 0) {
            "${MediaStore.MediaColumns.DATE_MODIFIED} > ?"
        } else null

        val selectionArgs = if (afterDateSeconds > 0) {
            arrayOf(afterDateSeconds.toString())
        } else null

        // Перше сканування завантажує найновіші спочатку
        val sortOrder = "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"

        val cursor = context.contentResolver.query(
            contentUri,
            projection,
            selection,
            selectionArgs,
            sortOrder
        ) ?: return Pair(0, 0L)

        val buffer = ArrayList<FileIndexEntity>(BATCH_SIZE)
        var categoryImported = 0
        var maxCategoryDate = 0L

        cursor.use { c ->
            val dataColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DATA)
            val nameColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
            val dateColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED)
            val sizeColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
            Log.d("MediaStoreImporter", "rows = ${c.count}, afterDateSeconds=$afterDateSeconds")

            while (c.moveToNext()) {
                val rawPath = c.getString(dataColumn)

                Log.d(
                    "MediaStoreImporter",
                    "name=${c.getString(nameColumn)}, path=$rawPath"
                )

                if (rawPath == null) {
                    continue
                }
                val filePath = c.getString(dataColumn) ?: continue
                val fileName = c.getString(nameColumn) ?: filePath.substringAfterLast('/')
                val parentPath = filePath.substringBeforeLast('/', "")
                
                val lastModified = c.getLong(dateColumn) * 1000L
                val fileSize = c.getLong(sizeColumn)

                

                if (lastModified > maxCategoryDate) {
                    maxCategoryDate = lastModified
                }

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
                    fileIndexBox.put(buffer)
                    categoryImported += buffer.size
                    buffer.clear()
                }
            }

            if (buffer.isNotEmpty()) {
                fileIndexBox.put(buffer)
                categoryImported += buffer.size
                buffer.clear()
            }
        }

        return Pair(categoryImported, maxCategoryDate)
    }
}