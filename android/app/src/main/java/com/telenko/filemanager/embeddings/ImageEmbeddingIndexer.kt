package com.telenko.filemanager.embeddings

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.nio.FloatBuffer

private const val TAG = "ImageEmbeddingIndexer"

class ImageEmbeddingIndexer(
    private val ortEnv: OrtEnvironment,
    private val visualSession: OrtSession?
) : MediaEmbeddingIndexer {

    override val mediaType: MediaType = MediaType.IMAGE

    override fun supports(filePath: String): Boolean {
        val ext = filePath.substringAfterLast('.', "").lowercase()
        return ext in SUPPORTED_EXTENSIONS
    }

    override suspend fun indexFile(filePath: String): ExtractionResult = withContext(Dispatchers.IO) {
        val vector = getVisualEmbeddingInternal(filePath)
        Log.d(TAG, "Extracted visual embedding for image: $filePath")

        val fileName = filePath.substringAfterLast('/')

        // Автоматично повертається як результат withContext
        ExtractionResult(
            embeddings = listOf(
                FileEmbeddingEntity(
                    filePath = filePath,
                    fileName = fileName,
                    embedding = vector, // Виправлено: embedding замість vector
                    mediaType = MediaType.IMAGE.name, // Або mediaType.name, якщо це змінна класу
                    embeddingType = EmbeddingType.IMAGE.name
                )
            ),
            snapshots = emptyList()
        )
    }

    private fun getVisualEmbeddingInternal(imagePath: String): FloatArray {
        val session = visualSession 
            ?: throw IllegalStateException("Візуальна модель не ініціалізована!")

        val file = File(imagePath)
        if (!file.exists()) {
            throw IllegalArgumentException("Файл зображення не знайдено: $imagePath")
        }

        val bitmap = BitmapFactory.decodeFile(file.absolutePath)
            ?: throw IllegalArgumentException("Не вдалося декодувати зображення: $imagePath")

        return extractEmbeddingFromBitmap(bitmap, session)
    }

    /**
     * Перевикористовуваний метод для генерації вектора з будь-якого Bitmap.
     * Знадобиться також для кадрів відео та сторінок PDF!
     */
    fun extractEmbeddingFromBitmap(bitmap: Bitmap, session: OrtSession): FloatArray {
        val resizedBitmap = Bitmap.createScaledBitmap(bitmap, 224, 224, true)
        val floatBuffer = bitmapToFloatBuffer(resizedBitmap)
        val inputShape = longArrayOf(1, 3, 224, 224)

        val inputTensor = OnnxTensor.createTensor(ortEnv, floatBuffer, inputShape)
        val inputs = mapOf(session.inputNames.iterator().next() to inputTensor)

        val results = session.run(inputs)

        val outputName = session.outputNames.iterator().next()
        Log.d(TAG, "Vision Model Output Node Name: $outputName")

        val outputResult = results.get(outputName)
        if (!outputResult.isPresent) {
            inputTensor.close()
            results.close()
            throw Exception("Вихід '$outputName' відсутній у результатах сесії")
        }

        val outputTensor = outputResult.get() as OnnxTensor
        val embeddings = FloatArray(outputTensor.floatBuffer.remaining())
        outputTensor.floatBuffer.get(embeddings)

        inputTensor.close()
        results.close()

        return embeddings
    }

    private fun bitmapToFloatBuffer(bitmap: Bitmap): FloatBuffer {
        val buffer = FloatBuffer.allocate(1 * 3 * 224 * 224)
        val intValues = IntArray(224 * 224)
        bitmap.getPixels(intValues, 0, 224, 0, 0, 224, 224)

        val mean = floatArrayOf(0.48145466f, 0.4578275f, 0.40821073f)
        val std = floatArrayOf(0.26862954f, 0.26130258f, 0.27577711f)

        for (c in 0..2) {
            for (i in 0 until 224 * 224) {
                val pixel = intValues[i]
                val channelValue = when (c) {
                    0 -> (pixel shr 16 and 0xFF) / 255.0f
                    1 -> (pixel shr 8 and 0xFF) / 255.0f
                    else -> (pixel and 0xFF) / 255.0f
                }
                buffer.put((channelValue - mean[c]) / std[c])
            }
        }
        buffer.rewind()
        return buffer
    }

    companion object {
        private const val TAG = "ImageEmbeddingIndexer"
        private val SUPPORTED_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp", "bmp")
    }
}