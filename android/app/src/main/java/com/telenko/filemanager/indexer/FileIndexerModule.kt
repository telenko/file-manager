package com.telenko.filemanager.indexer.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.telenko.filemanager.indexer.FileIndexEntity
import com.telenko.filemanager.indexer.FileIndexerFacade
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import android.util.Log
import io.objectbox.Box
import kotlin.time.measureTimedValue

class FileIndexerModule(
    private val reactContext: ReactApplicationContext,
    private val fileIndexBox: Box<FileIndexEntity>
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FileIndexer"

    private val indexerFacade by lazy {
        FileIndexerFacade.getInstance(reactContext, fileIndexBox)
    }

    @ReactMethod
    fun startIndexing() {
        indexerFacade.startIndexing { status, count ->
            val params = Arguments.createMap().apply {
                putString("status", status)
                putInt("count", count)
            }
            sendEvent("onIndexingProgress", params)
        }
    }

    @ReactMethod
    fun stopIndexing() {
        indexerFacade.stopIndexing()
    }

    @ReactMethod
    fun indexFile(filePath: String, promise: Promise) {
        try {
            indexerFacade.indexFile(filePath)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INDEX_ERROR", e.message)
        }
    }

    @ReactMethod
    fun indexDirectory(dirPath: String, promise: Promise) {
        try {
            indexerFacade.indexDirectory(dirPath)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INDEX_ERROR", e.message)
        }
    }

    @ReactMethod
    fun removeFile(filePath: String, promise: Promise) {
        try {
            indexerFacade.removeFile(filePath)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REMOVE_ERROR", e.message)
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun getFiles(mediaTypes: ReadableArray?, limit: Int, promise: Promise) {
        val (resultArray, duration) = measureTimedValue {
            val typesList = mediaTypes?.toArrayList()?.mapNotNull { it?.toString() }
            val files = indexerFacade.getFilesByMediaTypes(typesList, limit.toLong()).take(100)            
            // Конвертація в WritableArray
            val array = Arguments.createArray()
            for (file in files) {
                val map = Arguments.createMap().apply {
                    putDouble("id", file.id.toDouble())
                    putString("filePath", file.filePath)
                    putString("fileName", file.fileName)
                    putString("mediaType", file.mediaType.name)
                    putDouble("lastModified", file.lastModified.toDouble())
                    putDouble("fileSize", file.fileSize.toDouble())
                    putString("parentPath", file.parentPath)
                }
                array.pushMap(map)
            }
            array
        }
        
        Log.d("Benchmark", "⏱️ [getFiles + JS Bridge]: $duration")
        promise.resolve(resultArray)
    }
}