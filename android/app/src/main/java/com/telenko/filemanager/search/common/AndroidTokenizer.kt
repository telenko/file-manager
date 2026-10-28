package com.telenko.filemanager.search.common

import android.content.Context
import org.json.JSONObject
import java.io.File

class AndroidTokenizer(context: Context, assetFileName: String = "tokenizer_text.json") {
    
    private val vocab = mutableMapOf<String, Long>()
    private val unkTokenId: Long
    private val clsTokenId: Long
    private val sepTokenId: Long
    private val padTokenId: Long

    init {
        val file = File(context.cacheDir, assetFileName)
        if (!file.exists()) {
            context.assets.open(assetFileName).use { inputStream ->
                file.outputStream().use { outputStream -> inputStream.copyTo(outputStream) }
            }
        }
        
        val jsonString = file.readText()
        val jsonObject = JSONObject(jsonString)
        
        // Парсинг словника з model -> vocab
        val modelObj = jsonObject.getJSONObject("model")
        val vocabObj = modelObj.getJSONObject("vocab")
        val keys = vocabObj.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            vocab[key] = vocabObj.getLong(key)
        }

        // Спеціальні токени згідно з вашим JSON
        padTokenId = vocab["[PAD]"] ?: 0L
        unkTokenId = vocab["[UNK]"] ?: 100L
        clsTokenId = vocab["[CLS]"] ?: 101L
        sepTokenId = vocab["[SEP]"] ?: 102L
    }

    fun tokenize(text: String, maxLength: Int = 77): Pair<LongArray, LongArray> {
        val cleanedText = text.trim()

        val tokens = mutableListOf<Long>()
        tokens.add(clsTokenId)

        val words = cleanedText.split(Regex("\\s+"))
        for (word in words) {
            if (word.isEmpty()) continue
            tokens.addAll(tokenizeWordPiece(word))
        }

        tokens.add(sepTokenId)

        val eosTokenId = 49407L
        
        val inputIds = LongArray(maxLength) { padTokenId }
        val attentionMask = LongArray(maxLength) { 0L }

        val copyLength = minOf(tokens.size, maxLength)
        for (i in 0 until copyLength) {
            inputIds[i] = tokens[i]
            attentionMask[i] = 1L
        }

        return Pair(inputIds, attentionMask)
    }

    private fun tokenizeWordPiece(word: String): List<Long> {
        val wordTokens = mutableListOf<Long>()
        var start = 0
        var isUnknown = false

        while (start < word.length) {
            var end = word.length
            var curSubword: String? = null

            while (end > start) {
                var subword = word.substring(start, end)
                if (start > 0) {
                    subword = "##$subword"
                }
                if (vocab.containsKey(subword)) {
                    curSubword = subword
                    break
                }
                end--
            }

            if (curSubword == null) {
                isUnknown = true
                break
            }

            wordTokens.add(vocab[curSubword]!!)
            start = end
        }

        if (isUnknown) {
            wordTokens.add(unkTokenId)
        }

        return wordTokens
    }
}