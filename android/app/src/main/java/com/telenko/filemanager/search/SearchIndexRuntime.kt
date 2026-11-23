package com.telenko.filemanager.search

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.util.Log
import com.telenko.filemanager.search.common.AndroidTokenizer
import com.telenko.filemanager.search.snapshot.TextEmbeddingIndexer
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import java.nio.FloatBuffer

internal data class SearchIndexRuntime(
    val fileSearchIndexer: FileSearchIndexer,
    val textEmbeddingIndexer: TextEmbeddingIndexer,
    val searchIndexManager: SearchIndexManager
)

internal object SearchIndexRuntimeProvider {
    private const val TAG = "SearchIndexRuntime"
    private const val MODEL_PATH = "/storage/emulated/0/Download/model_embeddings/model_vision.onnx"
    private const val TEXT_MODEL_PATH = "/storage/emulated/0/Download/model_embeddings/model_text.onnx"
    private const val TOKENIZER_ASSET = "tokenizer_text.json"

    @Volatile
    private var runtime: SearchIndexRuntime? = null

    @Synchronized
    fun getOrInitialize(context: Context): SearchIndexRuntime {
        runtime?.let { return it }

        val appContext = context.applicationContext
        PDFBoxResourceLoader.init(appContext)
        val ortEnv = OrtEnvironment.getEnvironment()
        val options = OrtSession.SessionOptions().apply {
            setIntraOpNumThreads(1)
            setInterOpNumThreads(1)
            setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
        }

        val visualSession = ortEnv.createSession(MODEL_PATH, options)
        val textSession = try {
            ortEnv.createSession(TEXT_MODEL_PATH, options)
        } catch (error: Exception) {
            visualSession.close()
            throw error
        }

        try {
            val dummyBuffer = FloatBuffer.allocate(1 * 3 * 224 * 224)
            val dummyTensor = OnnxTensor.createTensor(
                ortEnv,
                dummyBuffer,
                longArrayOf(1, 3, 224, 224)
            )
            try {
                visualSession.run(mapOf("pixel_values" to dummyTensor)).close()
            } finally {
                dummyTensor.close()
            }

            val tokenizer = AndroidTokenizer(appContext, TOKENIZER_ASSET)
            val fileSearchIndexer = FileSearchIndexer(
                context = appContext,
                ortEnv = ortEnv,
                visualSession = visualSession,
                textSession = textSession,
                textTokenizer = tokenizer
            )
            val nextRuntime = SearchIndexRuntime(
                fileSearchIndexer = fileSearchIndexer,
                textEmbeddingIndexer = TextEmbeddingIndexer(ortEnv, textSession, tokenizer),
                searchIndexManager = SearchIndexManager(appContext)
            )

            runtime = nextRuntime
            Log.i(TAG, "Search models initialized")
            return nextRuntime
        } catch (error: Exception) {
            textSession.close()
            visualSession.close()
            throw error
        }
    }
}