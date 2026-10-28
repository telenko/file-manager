package com.telenko.filemanager.search

import android.content.Context
import android.util.Log
import com.telenko.filemanager.search.common.MediaType
import com.telenko.filemanager.search.common.SearchContext
import com.telenko.filemanager.search.common.SearchResult
import com.telenko.filemanager.search.snapshot.FileTextSnapshotEntity
import com.telenko.filemanager.search.snapshot.FileTextSnapshotEntity_
import com.telenko.filemanager.search.embeddings.FileEmbeddingEntity
import com.telenko.filemanager.search.embeddings.FileEmbeddingEntity_
import io.objectbox.Box
import io.objectbox.query.QueryBuilder
import kotlin.math.sqrt
import com.telenko.filemanager.db.ObjectBoxStore

private const val TAG = "VectorSearchManager"

class VectorSearchManager(context: Context) {

    private val box: Box<FileEmbeddingEntity> = ObjectBoxStore.get(context).boxFor(FileEmbeddingEntity::class.java)
    private val snapshotBox: Box<FileTextSnapshotEntity> = ObjectBoxStore.get(context).boxFor(FileTextSnapshotEntity::class.java)

    fun searchTopK(
        queryVector: FloatArray,
        queryText: String? = null,
        searchContext: SearchContext,
        offset: Int = 0,
        size: Int = 50,
        targetFolder: String? = null
    ): List<SearchResult> {

        Log.d(TAG, "🔍 Пошук. Контекст: $searchContext | Запит: '$queryText' | Offset: $offset, Size: $size")

        val allResults = when (searchContext) {
            SearchContext.VISUAL -> searchVisual(queryVector, targetFolder)
            SearchContext.TEXT -> searchText(queryText ?: "", targetFolder)
            SearchContext.ALL -> {
                val visualResults = searchVisual(queryVector, targetFolder)
                val textResults = searchText(queryText ?: "", targetFolder)

                // Об'єднуємо результати та групуємо по filePath, обираючи максимальний скор
                (visualResults + textResults)
                    .groupBy { it.filePath }
                    .mapValues { (_, results) -> results.maxByOrNull { it.score }!! }
                    .values
                    .sortedByDescending { it.score }
            }
        }

        // Застосовуємо пагінацію (offset + size) безпосередньо в пам'яті після об'єднання/сортування
        return paginate(allResults, offset, size)
    }

    private fun paginate(results: List<SearchResult>, offset: Int, size: Int): List<SearchResult> {
        if (offset >= results.size) return emptyList()
        val endIdx = minOf(offset + size, results.size)
        return results.subList(offset, endIdx)
    }

    // --- Візуальний пошук (всі доступні збіги) ---
    private fun searchVisual(
        queryVector: FloatArray,
        targetFolder: String?
    ): List<SearchResult> {
        val qb = box.query()
        applyFolderFilter(qb, targetFolder)

        qb.equal(FileEmbeddingEntity_.mediaType, MediaType.IMAGE.name, QueryBuilder.StringOrder.CASE_SENSITIVE)
            .or()
            .equal(FileEmbeddingEntity_.mediaType, MediaType.VIDEO.name, QueryBuilder.StringOrder.CASE_SENSITIVE)

        // Використовуємо загальну кількість записів замість фіксованого ліміту у 50
        val totalCount = box.count()
        val candidateLimit = if (totalCount > 0) totalCount.toInt() else 1000

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
                    pageIndex = entity.pageIndex,
                    frameTimeMs = entity.frameTimeMs
                )
            }
            .groupBy { it.filePath }
            .mapValues { (_, results) -> results.maxByOrNull { it.score }!! }
            .values
            .sortedByDescending { it.score }
    }

    // --- Текстовий пошук (всі збіги без обмежень) ---
    private fun searchText(
        queryText: String,
        targetFolder: String?
    ): List<SearchResult> {
        val tokens = tokenizeQuery(queryText)
        if (tokens.isEmpty()) return emptyList()

        val matchingSnapshots = fetchAllTextSnapshots(tokens, targetFolder)
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
                    pageIndex = snapshot.pageIndex,
                    frameTimeMs = 0L
                )
            }
            .filter { it.score > 0.0f }
            .groupBy { it.filePath }
            .mapValues { (_, results) -> results.maxByOrNull { it.score }!! }
            .values
            .sortedByDescending { it.score }
    }

    // --- Отримання всіх збігів без ліміту по токенах ---
    private fun fetchAllTextSnapshots(
        tokens: List<String>,
        targetFolder: String?
    ): List<FileTextSnapshotEntity> {
        if (tokens.isEmpty()) return emptyList()

        val qb = snapshotBox.query()

        if (!targetFolder.isNullOrBlank()) {
            val formattedFolder = if (targetFolder.endsWith("/")) targetFolder else "$targetFolder/"
            qb.startsWith(FileTextSnapshotEntity_.filePath, formattedFolder, QueryBuilder.StringOrder.CASE_SENSITIVE)
        }

        tokens.forEachIndexed { index, token ->
            if (index > 0) {
                qb.or()
            }
            qb.contains(FileTextSnapshotEntity_.text, token, QueryBuilder.StringOrder.CASE_INSENSITIVE)
                .or()
                .contains(FileTextSnapshotEntity_.fileName, token, QueryBuilder.StringOrder.CASE_INSENSITIVE)
        }

        // Викликаємо find() без обмежень, щоб отримати всі результати
        return qb.build().find()
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