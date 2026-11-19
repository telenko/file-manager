package com.telenko.filemanager.search

import android.util.Log
import android.content.Context
import com.facebook.react.bridge.*
import com.telenko.filemanager.search.common.SearchContext
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

    // 3. ПОШУК ФАЙЛІВ З ПАГІНАЦІЄЮ ТА CONTEXT.ALL
    @ReactMethod
    fun searchFiles(
        queryText: String,
        searchContextString: String,
        targetFolder: String?,
        offset: Int,
        size: Int,
        promise: Promise
    ) {
        moduleScope.launch {
            try {
                val runtime = SearchIndexRuntimeProvider.getOrInitialize(reactContext)

                val searchContext = try {
                    SearchContext.valueOf(searchContextString.uppercase())
                } catch (e: IllegalArgumentException) {
                    throw IllegalArgumentException("Invalid search context: $searchContextString. Supported values: VISUAL, TEXT, ALL.")
                }

                val queryEmbedding = runtime.textEmbeddingIndexer.getTextEmbedding(queryText)

                val results = runtime.vectorSearchManager.searchTopK(
                    queryVector = queryEmbedding,
                    queryText = queryText,
                    searchContext = searchContext,
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
                Log.e(TAG, "Search error for query: $queryText with context: $searchContextString", e)
                promise.reject("SEARCH_ERROR", e.message, e)
            }
        }
    }
}