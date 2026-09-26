package com.telenko.filemanager.embeddings

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.LongBuffer
import kotlin.math.sqrt

class TextEmbeddingIndexer(
    private val ortEnv: OrtEnvironment,
    private val textSession: OrtSession?,
    private val tokenizer: AndroidTokenizer
) {

    fun getTextEmbedding(text: String): FloatArray {
        return getTextEmbeddingInternal(text)
    }

    private fun getTextEmbeddingInternal(text: String): FloatArray {
        val session = textSession ?: throw IllegalStateException("Текстова модель не ініціалізована!")
        if (text.isBlank()) throw IllegalArgumentException("Текст не може бути порожнім.")

        val maxSeqLen = 77
        val tokenizationResult = tokenizer.tokenize(text, maxSeqLen)
        val inputIds = tokenizationResult.first
        val attentionMask = tokenizationResult.second

        val shape = longArrayOf(1, maxSeqLen.toLong())

        val inputIdsTensor = OnnxTensor.createTensor(ortEnv, LongBuffer.wrap(inputIds), shape)
        val attentionMaskTensor = OnnxTensor.createTensor(ortEnv, LongBuffer.wrap(attentionMask), shape)

        val inputs = mutableMapOf<String, OnnxTensor>()
        val inputNames = session.inputNames

        if (inputNames.contains("input_ids")) inputs["input_ids"] = inputIdsTensor
        if (inputNames.contains("attention_mask")) inputs["attention_mask"] = attentionMaskTensor

        try {
            val results = session.run(inputs)

            results.use { res ->
                var rawEmbeddings: FloatArray? = null

                for (outputName in session.outputNames) {
                    val resultOpt = res.get(outputName)
                    if (resultOpt.isPresent) {
                        val tensor = resultOpt.get() as OnnxTensor
                        val buffer = tensor.floatBuffer
                        val totalElements = buffer.remaining()

                        // Випадок 1: Модель вже повертає готовий фінальний вектор [1, 512]
                        if (totalElements == 512) {
                            val embedding = FloatArray(512)
                            buffer.get(embedding)
                            rawEmbeddings = embedding
                            break
                        } 
                        // Випадок 2: Модель повертає послідовність токенів [1, 77, 512] (39424 елементів)
                        else if (totalElements == 77 * 512) {
                            val fullBuffer = FloatArray(totalElements)
                            buffer.get(fullBuffer)
                            
                            // Робимо Mean Pooling (середнє значення по всіх токенах за маскою)
                            rawEmbeddings = meanPooling(fullBuffer, attentionMask, 77, 512)
                            break
                        }
                    }
                }

                // Якщо спец-структура не знайшлася, беремо перший наявний тензор
                if (rawEmbeddings == null) {
                    val firstTensor = res.get(session.outputNames.first()).get() as OnnxTensor
                    val buffer = firstTensor.floatBuffer
                    val size = minOf(buffer.remaining(), 512)
                    rawEmbeddings = FloatArray(size)
                    buffer.get(rawEmbeddings)
                }

                // КРИТИЧНО: Обов'язкова L2-нормалізація текстового вектора
                return normalizeL2(rawEmbeddings)
            }
        } finally {
            inputs.values.forEach { it.close() }
        }
    }

    /**
     * Усереднення векторів токенів за attentionMask, якщо модель повертає [1, 77, 512]
     */
    private fun meanPooling(
        fullBuffer: FloatArray,
        attentionMask: LongArray,
        seqLen: Int,
        hiddenDim: Int
    ): FloatArray {
        val pooled = FloatArray(hiddenDim)
        var validTokensCount = 0f

        for (i in 0 until seqLen) {
            if (attentionMask[i] == 1L) {
                validTokensCount += 1f
                val offset = i * hiddenDim
                for (d in 0 until hiddenDim) {
                    pooled[d] += fullBuffer[offset + d]
                }
            }
        }

        if (validTokensCount > 0f) {
            for (d in 0 until hiddenDim) {
                pooled[d] /= validTokensCount
            }
        }

        return pooled
    }

    /**
     * L2 Нормалізація для приведення вектора до одиничної довжини (для Cosine Similarity)
     */
    private fun normalizeL2(vector: FloatArray): FloatArray {
        var sumSquare = 0.0f
        for (v in vector) {
            sumSquare += v * v
        }
        val norm = sqrt(sumSquare)
        if (norm > 0f) {
            for (i in vector.indices) {
                vector[i] /= norm
            }
        }
        return vector
    }
}