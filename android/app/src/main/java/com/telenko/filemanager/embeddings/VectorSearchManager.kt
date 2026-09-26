package com.telenko.filemanager.embeddings

import android.content.Context
import android.util.Log
import io.objectbox.Box
import io.objectbox.query.QueryBuilder
import kotlin.math.sqrt

private const val TAG = "VectorSearchManager"

class VectorSearchManager(context: Context) {

    private val box: Box<FileEmbeddingEntity> = ObjectBoxStore.get(context).boxFor(FileEmbeddingEntity::class.java)
    private val snapshotBox: Box<FileTextSnapshotEntity> = ObjectBoxStore.get(context).boxFor(FileTextSnapshotEntity::class.java)

    fun searchTopK(
        queryVector: FloatArray,
        queryText: String? = null,
        searchContext: SearchContext,
        topK: Int = 10,
        targetFolder: String? = null,
        candidateLimit: Int = 50
    ): List<SearchResult> {

        if (searchContext == SearchContext.ALL) {
            throw IllegalArgumentException("SearchContext.ALL is currently not supported. Use VISUAL or TEXT.")
        }

        Log.d(TAG, "🔍 Пошук. Контекст: $searchContext | Запит: '$queryText'")

        return when (searchContext) {
            SearchContext.VISUAL -> searchVisual(queryVector, targetFolder, candidateLimit, topK)
            SearchContext.TEXT -> searchText(queryText ?: "", targetFolder, candidateLimit, topK)
            else -> emptyList()
        }
    }

    // --- Візуальний пошук (тільки вектори) ---
    private fun searchVisual(
        queryVector: FloatArray,
        targetFolder: String?,
        candidateLimit: Int,
        topK: Int
    ): List<SearchResult> {
        val qb = box.query()
        applyFolderFilter(qb, targetFolder)

        qb.equal(FileEmbeddingEntity_.mediaType, MediaType.IMAGE.name, QueryBuilder.StringOrder.CASE_SENSITIVE)
            .or()
            .equal(FileEmbeddingEntity_.mediaType, MediaType.VIDEO.name, QueryBuilder.StringOrder.CASE_SENSITIVE)

        val visualEntities = qb.nearestNeighbors(FileEmbeddingEntity_.embedding, queryVector, candidateLimit)
            .build()
            .find()

        Log.d(TAG, "Found ${visualEntities.size} visual candidates.")

        return visualEntities
            .map { entity ->
                SearchResult(
                    filePath = entity.filePath,
                    fileName = entity.fileName,
                    score = cosineSimilarity(queryVector, entity.embedding),
                    mediaType = entity.mediaType,
                    embeddingType = entity.embeddingType,
                    pageIndex = entity.pageIndex,
                    frameTimeMs = entity.frameTimeMs
                )
            }
            .groupBy { it.filePath }
            .mapValues { (_, results) -> results.maxByOrNull { it.score }!! }
            .values
            .sortedByDescending { it.score }
            .take(topK)
    }

    // --- Текстовий пошук (тільки чисті текстові снепшоти в 1 запит) ---
    private fun searchText(
        queryText: String,
        targetFolder: String?,
        candidateLimit: Int,
        topK: Int
    ): List<SearchResult> {
        val tokens = tokenizeQuery(queryText)
        if (tokens.isEmpty()) return emptyList()

        val matchingSnapshots = fetchTextSnapshotsInSingleQuery(tokens, targetFolder, candidateLimit)
        Log.d(TAG, "Found ${matchingSnapshots.size} text snapshots matching query tokens.")

        return matchingSnapshots
            .map { snapshot ->
                val textContent = "${snapshot.text} ${snapshot.fileName}"
                val matchScore = calculateTextMatchScore(tokens, textContent)

                SearchResult(
                    filePath = snapshot.filePath,
                    fileName = snapshot.fileName,
                    score = matchScore,
                    mediaType = MediaType.PDF.name,
                    embeddingType = EmbeddingType.NONE.name,
                    pageIndex = snapshot.pageIndex,
                    frameTimeMs = 0L
                )
            }
            .filter { it.score > 0.0f }
            .groupBy { it.filePath }
            .mapValues { (_, results) -> results.maxByOrNull { it.score }!! }
            .values
            .sortedByDescending { it.score }
            .take(topK)
    }

    // --- Одиничний запит до бази для всіх токенів ---
    private fun fetchTextSnapshotsInSingleQuery(
        tokens: List<String>,
        targetFolder: String?,
        limit: Int
    ): List<FileTextSnapshotEntity> {
        if (tokens.isEmpty()) return emptyList()

        val qb = snapshotBox.query()

        if (!targetFolder.isNullOrBlank()) {
            val formattedFolder = if (targetFolder.endsWith("/")) targetFolder else "$targetFolder/"
            qb.startsWith(FileTextSnapshotEntity_.filePath, formattedFolder, QueryBuilder.StringOrder.CASE_SENSITIVE)
        }

        // Будуємо ланцюжок .contains() OR .contains() в одному запиті
        tokens.forEachIndexed { index, token ->
            if (index > 0) {
                qb.or()
            }
            qb.contains(FileTextSnapshotEntity_.text, token, QueryBuilder.StringOrder.CASE_INSENSITIVE)
                .or()
                .contains(FileTextSnapshotEntity_.fileName, token, QueryBuilder.StringOrder.CASE_INSENSITIVE)
        }

        return qb.build().find(0, limit.toLong())
    }

    private fun applyFolderFilter(qb: QueryBuilder<FileEmbeddingEntity>, targetFolder: String?) {
        if (!targetFolder.isNullOrBlank()) {
            val formattedFolder = if (targetFolder.endsWith("/")) targetFolder else "$targetFolder/"
            qb.startsWith(FileEmbeddingEntity_.filePath, formattedFolder, QueryBuilder.StringOrder.CASE_SENSITIVE)
        }
    }

    private fun tokenizeQuery(query: String): List<String> {
        if (query.isBlank()) return emptyList()
        return query
            .lowercase()
            .split("[\\s\\p{Punct}]+".toRegex())
            .filter { it.length > 1 }
            .distinct()
    }

    private fun calculateTextMatchScore(tokens: List<String>, textContent: String): Float {
        if (tokens.isEmpty() || textContent.isBlank()) return 0.0f
        val textLower = textContent.lowercase()
        var matchedCount = 0

        for (token in tokens) {
            if (textLower.contains(token)) {
                matchedCount++
            }
        }
        return matchedCount.toFloat() / tokens.size.toFloat()
    }

    private fun cosineSimilarity(v1: FloatArray, v2: FloatArray): Float {
        if (v1.size != v2.size || v1.isEmpty()) return 0.0f
        var dotProduct = 0.0f
        var normA = 0.0f
        var normB = 0.0f

        for (i in v1.indices) {
            dotProduct += v1[i] * v2[i]
            normA += v1[i] * v1[i]
            normB += v2[i] * v2[i]
        }

        val denominator = (sqrt(normA.toDouble()) * sqrt(normB.toDouble())).toFloat()
        return if (denominator > 0f) dotProduct / denominator else 0.0f
    }
}