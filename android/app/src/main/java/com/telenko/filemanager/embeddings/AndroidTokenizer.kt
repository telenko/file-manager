package com.telenko.filemanager.embeddings

import android.content.Context
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer
import java.io.File

class AndroidTokenizer(context: Context, assetFileName: String = "tokenizer_text.json") {
    private val tokenizer: HuggingFaceTokenizer

    init {
        // Копіюємо файл із assets у безпечний внутрішній кеш додатку
        val file = File(context.cacheDir, assetFileName)
        
        if (!file.exists()) {
            context.assets.open(assetFileName).use { inputStream ->
                file.outputStream().use { outputStream ->
                    inputStream.copyTo(outputStream)
                }
            }
        }

        // Завантажуємо HuggingFace токенізатор з локального кешу
        tokenizer = HuggingFaceTokenizer.newInstance(file.toPath())
    }

    fun tokenize(text: String, maxLength: Int = 77): Pair<LongArray, LongArray> {
        val encoding = tokenizer.encode(text)
        
        val rawIds = encoding.ids
        val rawMask = encoding.attentionMask

        val inputIds = LongArray(maxLength) { 0L }
        val attentionMask = LongArray(maxLength) { 0L }

        val length = minOf(rawIds.size, maxLength)
        for (i in 0 until length) {
            inputIds[i] = rawIds[i]
            attentionMask[i] = rawMask[i]
        }

        return Pair(inputIds, attentionMask)
    }
}