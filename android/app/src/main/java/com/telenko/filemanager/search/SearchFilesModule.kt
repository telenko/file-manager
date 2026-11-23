package com.telenko.filemanager.search

import android.util.Log
import android.content.Context
import com.facebook.react.bridge.*
import com.telenko.filemanager.infiniteapi.MediaType
import com.telenko.filemanager.search.common.SearchFilter
import kotlinx.coroutines.*

private const val TAG = "EMBEDDINGS_MODULE"
private val moduleScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

class SearchFilesModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SearchFilesModule"

    @ReactMethod
    fun getSearchIndexProgress(promise: Promise) {
        val progress = reactContext.getSharedPreferences(
            SearchIndexProgressEmitter.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        )
        val params = Arguments.createMap().apply {
            putInt("percentage", progress.getInt("percentage", 0))
            putInt("indexedFiles", progress.getInt("indexedFiles", 0))
            putInt("totalFiles", progress.getInt("totalFiles", 0))
            putString("status", progress.getString("status", "idle"))
        }
        promise.resolve(params)
    }

    // 1. ІНІЦІАЛІЗАЦІЯ МОДЕЛЕЙ
    @ReactMethod
    fun initModel(promise: Promise) {
        moduleScope.launch {
            try {
                SearchIndexRuntimeProvider.getOrInitialize(reactContext)
                SearchIndexWorkScheduler.enqueue(reactContext)
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize models", e)
                promise.reject("INIT_ERROR", e.message, e)
            }
        }
    }

    // ПОШУК ПО ВСІХ ПОШУКОВИХ ФАСАДАХ З ПАГІНАЦІЄЮ
    @ReactMethod
    fun searchFiles(
        queryText: String,
        searchFilterMap: ReadableMap?,
        targetFolder: String?,
        offset: Int,
        size: Int,
        promise: Promise
    ) {
        moduleScope.launch {
            try {
                val runtime = SearchIndexRuntimeProvider.getOrInitialize(reactContext)
                val mediaTypes = parseMediaTypes(searchFilterMap)
                val searchFilter = SearchFilter(mediaTypes)

                val queryEmbedding = runtime.textEmbeddingIndexer.getTextEmbedding(queryText)

                val results = runtime.searchIndexManager.searchTopK(
                    queryVector = queryEmbedding,
                    queryText = queryText,
                    filter = searchFilter,
                    offset = offset,
                    size = size,
                    targetFolder = targetFolder
                )

                val resultArray = WritableNativeArray()
                for (res in results) {
                    val map = WritableNativeMap().apply {
                        putString("filePath", res.filePath)
                        putString("fileName", res.fileName)
                        putDouble(
                            "lastModified",
                            java.io.File(res.filePath).lastModified().toDouble()
                        )
                        putDouble("score", res.score.toDouble())
                        putString("mediaType", res.mediaType)
                        if (res.pageIndex >= 0) putInt("pageIndex", res.pageIndex)
                        if (res.frameTimeMs >= 0) putDouble("frameTimeMs", res.frameTimeMs.toDouble())
                    }
                    resultArray.pushMap(map)
                }

                promise.resolve(resultArray)
            } catch (e: Exception) {
                Log.e(TAG, "Search error for query: $queryText", e)
                promise.reject("SEARCH_ERROR", e.message, e)
            }
        }
    }

    private fun parseMediaTypes(searchFilterMap: ReadableMap?): List<MediaType> {
        val mediaTypesArray = searchFilterMap?.getArray("mediaTypes") ?: return emptyList()
        val mediaTypes = mutableListOf<MediaType>()
        for (index in 0 until mediaTypesArray.size()) {
            val value = mediaTypesArray.getString(index)?.uppercase() ?: continue
            try {
                mediaTypes.add(MediaType.valueOf(value))
            } catch (_: IllegalArgumentException) {
                // Ignore unknown media types.
            }
        }
        return mediaTypes.distinct()
    }
}