package com.telenko.filemanager.embeddings

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.LongBuffer

class TextEmbeddingIndexer(
    private val ortEnv: OrtEnvironment,
    private val textSession: OrtSession?,
    private val tokenizer: AndroidTokenizer // ваш клас токенізатора
) {

    /**
     * Єдиний публічний метод для отримання ембеддінга по тексту
     */
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
                var selectedTensor: OnnxTensor? = null

                for (outputName in session.outputNames) {
                    val resultOpt = res.get(outputName)
                    if (resultOpt.isPresent) {
                        val tensor = resultOpt.get() as OnnxTensor
                        val buffer = tensor.floatBuffer

                        if (buffer.remaining() == 512) {
                            selectedTensor = tensor
                            break
                        }
                    }
                }

                val finalTensor = selectedTensor ?: (res.get(session.outputNames.last()).get() as OnnxTensor)

                val rawBuffer = finalTensor.floatBuffer
                val embedding = FloatArray(rawBuffer.remaining())
                rawBuffer.get(embedding)

                return embedding
            }
        } finally {
            inputs.values.forEach { it.close() }
        }
    }
}