package com.telenko.filemanager.embeddings

import android.util.Log
import com.facebook.react.bridge.*
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.OnnxTensor
import java.nio.FloatBuffer
import java.nio.LongBuffer
import kotlinx.coroutines.*
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import kotlin.math.sqrt

// @TODO Andrii plan for indexing feature
// 1. consistency of image and pdf indexers (5p) [DONE]
// 1.1. cache of all files in system + events listening -> emiting events embeddings changes (5p)
// 2. syncing indexer with battery and memory usage + limit of indexing (8p)
// 3. re-syncing engine based on events from ui and android events + scheduler (8p)
// 4. UI layout + settings (3p)
// 5. S3 for models + download and use S3 models within app (5p)
// 6. build optimization and preparing for release / measuring size needed (5p)

private const val TAG = "EMBEDDINGS_MODULE"
private val moduleScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

class EmbeddingsModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        // Ініціалізуємо PDFBox один раз для Android Context
        PDFBoxResourceLoader.init(reactContext)
    }

    private var ortEnv: OrtEnvironment = OrtEnvironment.getEnvironment()
    private var visualSession: OrtSession? = null
    private var textSession: OrtSession? = null

    private val tokenizer by lazy {
        AndroidTokenizer(reactContext, "tokenizer_text.json")
    }

    private var fileManagerIndexer: FileManagerIndexer? = null
    private var textEmbeddingIndexer: TextEmbeddingIndexer? = null
    private var vectorSearchManager: VectorSearchManager? = null

    private val modelPath = "/storage/emulated/0/Download/model_embeddings/model_vision.onnx"
    private val textModelPath = "/storage/emulated/0/Download/model_embeddings/model_text.onnx"

    override fun getName(): String = "EmbeddingsModule"

    // 1. ІНІЦІАЛІЗАЦІЯ МОДЕЛЕЙ
    @ReactMethod
    fun initModel(promise: Promise) {
        moduleScope.launch {
            try {
                val opts = OrtSession.SessionOptions().apply {
                    setIntraOpNumThreads(2)
                    setInterOpNumThreads(1)
                    setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
                }

                visualSession = ortEnv.createSession(modelPath, opts)
                textSession = ortEnv.createSession(textModelPath, opts)
                vectorSearchManager = VectorSearchManager(reactContext)

                fileManagerIndexer = FileManagerIndexer(
                    context = reactContext,
                    ortEnv = ortEnv,
                    visualSession = visualSession,
                    textSession = textSession,
                    textTokenizer = tokenizer
                )

                textEmbeddingIndexer = TextEmbeddingIndexer(
                    ortEnv = ortEnv,
                    textSession = textSession,
                    tokenizer = tokenizer
                )

                // WARMUP
                val dummyBuffer = FloatBuffer.allocate(1 * 3 * 224 * 224)
                val dummyTensor = OnnxTensor.createTensor(ortEnv, dummyBuffer, longArrayOf(1, 3, 224, 224))

                val warmupStart = System.currentTimeMillis()
                visualSession?.run(mapOf("pixel_values" to dummyTensor))?.close()
                dummyTensor.close()

                Log.d(TAG, "Model Warmup completed in ${System.currentTimeMillis() - warmupStart} ms")

                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize models", e)
                promise.reject("INIT_ERROR", e.message, e)
            }
        }
    }

    // 2. ІНДЕКСАЦІЯ ПАПКИ
    @ReactMethod
    fun indexFolder(folderPath: String, recursive: Boolean, promise: Promise) {
        moduleScope.launch {
            try {
                val indexer = fileManagerIndexer
                    ?: throw IllegalStateException("Модуль індексації не ініціалізовано. Спочатку викличте initModel()")

                val indexedCount = indexer.indexFolder(
                    folderPath = folderPath,
                    recursive = recursive
                )

                val result = Arguments.createMap().apply {
                    putInt("indexed", indexedCount)
                    putString("folderPath", folderPath)
                }

                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to index folder: $folderPath", e)
                promise.reject("INDEX_ERROR", e.message, e)
            }
        }
    }

    // 3. ПОШУК ФАЙЛІВ З КОНТЕКСТОМ ПАПКИ ТА КОНТЕКСТОМ ПОШУКУ
    @ReactMethod
    fun searchFiles(
        queryText: String,
        searchContextString: String,
        targetFolder: String?,
        topK: Int,
        promise: Promise
    ) {
        val searchManager = vectorSearchManager
                    ?: throw IllegalStateException("Модуль пошуку не ініціалізовано. Спочатку викличте initModel()")
        moduleScope.launch {
            try {
                val indexer = fileManagerIndexer
                    ?: throw IllegalStateException("Модуль пошуку не ініціалізовано. Спочатку викличте initModel()")

                val textIndexer = textEmbeddingIndexer
                    ?: throw IllegalStateException("Модуль текстової індексації не ініціалізовано. Спочатку викличте initModel()")

                val searchContext = try {
                    SearchContext.valueOf(searchContextString.uppercase())
                } catch (e: IllegalArgumentException) {
                    throw IllegalArgumentException("Invalid search context: $searchContextString. Supported values: VISUAL, TEXT, ALL.")
                }

                val queryEmbedding = textIndexer.getTextEmbedding(queryText)

                val results = searchManager.searchTopK(
                    queryVector = queryEmbedding,
                    queryText = queryText,
                    searchContext = searchContext,
                    topK = topK,
                    targetFolder = targetFolder
                )

                val resultArray = WritableNativeArray()
                for (res in results) {
                    val map = WritableNativeMap().apply {
                        putString("filePath", res.filePath)
                        putString("fileName", res.fileName)
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