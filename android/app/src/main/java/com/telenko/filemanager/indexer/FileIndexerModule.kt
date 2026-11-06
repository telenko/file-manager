package com.telenko.filemanager.indexer.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.telenko.filemanager.indexer.FileIndexEntity
import com.telenko.filemanager.indexer.FileIndexerFacade
import com.telenko.filemanager.indexer.IndexerEvent
import com.telenko.filemanager.indexer.IndexerStateEntity
import com.telenko.filemanager.infiniteapi.MediaType
import io.objectbox.Box

class FileIndexerModule(
    private val reactContext: ReactApplicationContext,
    private val fileIndexBox: Box<FileIndexEntity>,
    private val stateBox: Box<IndexerStateEntity>
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FileIndexer"

    private val indexerFacade by lazy {
        FileIndexerFacade.getInstance(reactContext, fileIndexBox, stateBox)
    }

    @ReactMethod
    fun startIndexing() {
        indexerFacade.startIndexing(::sendIndexerEvent)
    }

    @ReactMethod
    fun forceRemoveIndex(paths: ReadableArray, promise: Promise) {
        if (paths.size() == 0) {
            promise.reject("INVALID_PATH", "At least one path is required")
            return
        }
        val parsedPaths = (0 until paths.size()).map { index ->
            paths.getString(index)
        }
        if (parsedPaths.any { it.isNullOrBlank() }) {
            promise.reject("INVALID_PATH", "Paths must contain non-empty strings")
            return
        }

        indexerFacade.forceRemoveIndex(
            parsedPaths.filterNotNull(),
            onEvent = { event ->
                sendIndexerEvent(event)
                promise.resolve(null)
            },
            onError = { error ->
                promise.reject("REMOVE_INDEX_ERROR", error)
            }
        )
    }

    @ReactMethod
    fun verifyFilesExist(paths: ReadableArray, promise: Promise) {
        if (paths.size() > 30) {
            promise.reject("TOO_MANY_PATHS", "At most 30 paths can be checked")
            return
        }

        val parsedPaths = (0 until paths.size()).map { index ->
            paths.getString(index)
        }
        if (parsedPaths.any { it.isNullOrBlank() }) {
            promise.reject("INVALID_PATH", "Paths must contain non-empty strings")
            return
        }

        indexerFacade.verifyFilesExist(
            parsedPaths.filterNotNull(),
            onEvent = ::sendIndexerEvent,
            onComplete = { _, _ -> promise.resolve(null) },
            onError = { error ->
                promise.reject("VERIFY_FILES_ERROR", error)
            }
        )
    }

    @ReactMethod
    fun stopIndexing() {
        indexerFacade.stopIndexing()
    }

    @ReactMethod
    fun getFilesPaged(mediaTypes: ReadableArray?, offset: Int, pageSize: Int, promise: Promise) {
        try {
            val parsedTypes = mediaTypes?.toArrayList()?.mapNotNull { item ->
                try { MediaType.valueOf(item.toString().uppercase()) } catch (e: Exception) { null }
            }

            val pagedFiles = indexerFacade.getFilesPaged(
                mediaTypes = parsedTypes,
                offset = offset.toLong(),
                pageSize = if (pageSize <= 0) 100 else pageSize
            )

            val array = Arguments.createArray()
            for (file in pagedFiles) {
                val map = Arguments.createMap().apply {
                    putString("filePath", file.filePath)
                    putDouble("lastModified", file.lastModified.toDouble())
                    putString("mediaType", file.mediaType.name)
                }
                array.pushMap(map)
            }

            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("FETCH_ERROR", e.message)
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun sendIndexerEvent(event: IndexerEvent) {
        val params = Arguments.createMap().apply {
            putString("event", event.name)
            event.count?.let { putInt("count", it) }
            event.removedPaths?.let {
                putArray("removedPaths", Arguments.fromList(it))
            }
        }
        sendEvent("onIndexingStatus", params)
    }
}