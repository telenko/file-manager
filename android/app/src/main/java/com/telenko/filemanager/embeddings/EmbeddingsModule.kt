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
    // recursive передається як Boolean, але виправлено сумісність із JS Number/Boolean
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

    // 3. ПОШУК ФАЙЛІВ З КОНТЕКСТОМ ПАПКИ
    @ReactMethod
    fun searchFiles(
        queryText: String,
        targetFolder: String?,
        topK: Int,
        promise: Promise
    ) {
        moduleScope.launch {
            try {
                val indexer = fileManagerIndexer
                    ?: throw IllegalStateException("Модуль пошуку не ініціалізовано. Спочатку викличте initModel()")

                var textIndexer = textEmbeddingIndexer
                    ?: throw IllegalStateException("Модуль текстової індексації не ініціалізовано. Спочатку викличте initModel()")

                // 1. Отримуємо текстовий вектор для пошукового запиту
                val queryEmbedding = textIndexer.getTextEmbedding(queryText)

                // 2. Шукаємо Top-K у базі даних лише серед файлів, що знаходяться у targetFolder (і підпапках)
                val results = indexer.vectorSearchManager.searchTopK(
                    queryVector = queryEmbedding,
                    topK = topK,
                    targetFolder = targetFolder
                )

                // 3. Формуємо результат для React Native
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
                Log.e(TAG, "Search error for query: $queryText", e)
                promise.reject("SEARCH_ERROR", e.message, e)
            }
        }
    }

}