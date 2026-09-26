package com.telenko.filemanager.embeddings

import android.content.Context
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer
import java.io.File

class AndroidTokenizer(context: Context, assetFileName: String = "tokenizer_text.json") {
    private val tokenizer: HuggingFaceTokenizer

    init {
        val file = File(context.cacheDir, assetFileName)
        if (!file.exists()) {
            context.assets.open(assetFileName).use { inputStream ->
                file.outputStream().use { outputStream -> inputStream.copyTo(outputStream) }
            }
        }
        tokenizer = HuggingFaceTokenizer.newInstance(file.toPath())
    }

    fun tokenize(text: String, maxLength: Int = 77): Pair<LongArray, LongArray> {
        val encoding = tokenizer.encode(text)
        
        val rawIds = encoding.ids
        val rawMask = encoding.attentionMask

        // ID токена EOS/PAD для стандартного CLIP = 49407. 
        // Якщо у вашій моделі це 0 чи інше значення, вкажіть його.
        val eosTokenId = 49407L 

        val inputIds = LongArray(maxLength) { eosTokenId }
        val attentionMask = LongArray(maxLength) { 0L }

        val length = minOf(rawIds.size, maxLength)
        
        for (i in 0 until length) {
            inputIds[i] = rawIds[i]
            attentionMask[i] = rawMask[i]
        }

        // Якщо токенізатор не додав EOS токен у кінець витягнутого тексту, додаємо його вручну
        if (length < maxLength && length > 0 && inputIds[length - 1] != eosTokenId) {
            inputIds[length] = eosTokenId
            attentionMask[length] = 1L
        }

        return Pair(inputIds, attentionMask)
    }
}