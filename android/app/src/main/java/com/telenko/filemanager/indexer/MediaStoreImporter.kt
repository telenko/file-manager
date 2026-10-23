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
        private const val TAG = "MediaStoreImporter"
        private const val BATCH_SIZE = 1000
    }

    suspend fun importMedia(isFirstScan: Boolean): Int = withContext(Dispatchers.IO) {
        Log.d(TAG, "importMedia: START. isFirstScan = $isFirstScan")
        
        val state = stateBox.get(1) ?: IndexerStateEntity().also {
            Log.d(TAG, "importMedia: State ID 1 not found in stateBox, created default state.")
        }
        
        val lastSavedDate = if (isFirstScan) 0L else state.mediaLastModifiedDate
        Log.d(TAG, "importMedia: state.mediaLastModifiedDate = ${state.mediaLastModifiedDate}, lastSavedDate = $lastSavedDate")

        var maxObservedDate = lastSavedDate
        var totalImported = 0

        val categories = listOf(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI to MediaType.IMAGE,
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI to MediaType.VIDEO,
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI to MediaType.MUSIC
        )

        for ((uri, type) in categories) {
            Log.d(TAG, "importMedia: Processing category -> $type using URI: $uri")
            val (imported, maxDate) = importCategory(
                contentUri = uri,
                mediaType = type,
                afterDateSeconds = lastSavedDate / 1000L
            )
            totalImported += imported
            if (maxDate > maxObservedDate) {
                maxObservedDate = maxDate
            }
            Log.d(TAG, "importMedia: Category $type finished. Imported: $imported, maxDate for category: $maxDate")
        }

        Log.d(TAG, "importMedia: All categories processed. Total imported in this run: $totalImported. maxObservedDate: $maxObservedDate")

        if (maxObservedDate > state.mediaLastModifiedDate) {
            state.mediaLastModifiedDate = maxObservedDate
            stateBox.put(state)
            Log.d(TAG, "importMedia: Updated stateBox with new mediaLastModifiedDate: $maxObservedDate")
        } else {
            Log.d(TAG, "importMedia: stateBox mediaLastModifiedDate unchanged.")
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

        val sortOrder = "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"

        Log.d(TAG, "importCategory [$mediaType]: query URI=$contentUri, selection=$selection, args=${selectionArgs?.contentToString()}")

        val cursor = try {
            context.contentResolver.query(
                contentUri,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )
        } catch (e: Exception) {
            Log.e(TAG, "importCategory [$mediaType]: Exception during query", e)
            null
        }

        if (cursor == null) {
            Log.w(TAG, "importCategory [$mediaType]: Cursor is NULL!")
            return Pair(0, 0L)
        }

        val buffer = ArrayList<FileIndexEntity>(BATCH_SIZE)
        var categoryImported = 0
        var maxCategoryDate = 0L

        cursor.use { c ->
            val dataColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DATA)
            val nameColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
            val dateColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED)
            val sizeColumn = c.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
            
            Log.d(TAG, "importCategory [$mediaType]: Total rows found in MediaStore cursor = ${c.count}")

            while (c.moveToNext()) {
                val rawPath = c.getString(dataColumn)
                if (rawPath == null) {
                    continue
                }
                
                val fileName = c.getString(nameColumn) ?: rawPath.substringAfterLast('/')
                val parentPath = rawPath.substringBeforeLast('/', "")
                val lastModified = c.getLong(dateColumn) * 1000L
                val fileSize = c.getLong(sizeColumn)

                if (lastModified > maxCategoryDate) {
                    maxCategoryDate = lastModified
                }

                val entity = FileIndexEntity(
                    filePath = rawPath,
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
                    Log.d(TAG, "importCategory [$mediaType]: Flushed batch of ${buffer.size} items. Total so far: $categoryImported")
                    buffer.clear()
                }
            }

            if (buffer.isNotEmpty()) {
                fileIndexBox.put(buffer)
                categoryImported += buffer.size
                Log.d(TAG, "importCategory [$mediaType]: Flushed final batch of ${buffer.size} items. Total category imported: $categoryImported")
                buffer.clear()
            }
        }

        return Pair(categoryImported, maxCategoryDate)
    }
}