package com.telenko.filemanager.search.embeddings

import android.content.Context
import com.telenko.filemanager.db.ObjectBoxStore
import com.telenko.filemanager.infiniteapi.MediaType
import com.telenko.filemanager.search.common.SearchFacade
import com.telenko.filemanager.search.common.SearchFilter
import com.telenko.filemanager.search.common.SearchResult
import io.objectbox.Box
import io.objectbox.query.QueryBuilder
import kotlin.math.sqrt

class VisualSearchFacade(
    context: Context,
    private val targetFolder: String? = null
) : SearchFacade<FloatArray> {

    companion object {
        const val searchFactor: Int = 60
    }

    override val searchFactor: Int = Companion.searchFactor

    private val box: Box<FileEmbeddingEntity> =
        ObjectBoxStore.get(context).boxFor(FileEmbeddingEntity::class.java)

    override fun search(query: FloatArray, filter: SearchFilter): List<SearchResult> {
        if (query.isEmpty()) return emptyList()

        val mediaTypes = filter.mediaTypes
        val includeImages = mediaTypes.isEmpty() || MediaType.IMAGE in mediaTypes
        val includeVideos = mediaTypes.isEmpty() || MediaType.VIDEO in mediaTypes
        if (!includeImages && !includeVideos) return emptyList()

        val qb = box.query()
        applyFolderFilter(qb)

        var mediaFilterAdded = false
        if (includeImages) {
            qb.equal(
                FileEmbeddingEntity_.mediaType,
                MediaType.IMAGE.name,
                QueryBuilder.StringOrder.CASE_SENSITIVE
            )
            mediaFilterAdded = true
        }
        if (includeVideos) {
            if (mediaFilterAdded) qb.or()
            qb.equal(
                FileEmbeddingEntity_.mediaType,
                MediaType.VIDEO.name,
                QueryBuilder.StringOrder.CASE_SENSITIVE
            )
        }

        val candidateLimit = box.count().coerceAtLeast(1).toInt()
        return qb.nearestNeighbors(FileEmbeddingEntity_.embedding, query, candidateLimit)
            .build()
            .find()
            .map { entity ->
                SearchResult(
                    filePath = entity.filePath,
                    fileName = entity.fileName,
                    score = cosineSimilarity(query, entity.embedding),
                    mediaType = entity.mediaType,
                    frameTimeMs = entity.frameTimeMs
                )
            }
            .map { it.copy(score = it.score.coerceIn(0.0f, 1.0f)) }
            .groupBy { it.filePath }
            .map { (_, results) -> results.maxByOrNull { it.score }!! }
            .sortedByDescending { it.score }
    }

    private fun applyFolderFilter(qb: QueryBuilder<FileEmbeddingEntity>) {
        if (!targetFolder.isNullOrBlank()) {
            val formattedFolder =
                if (targetFolder.endsWith("/")) targetFolder else "$targetFolder/"
            qb.startsWith(
                FileEmbeddingEntity_.filePath,
                formattedFolder,
                QueryBuilder.StringOrder.CASE_SENSITIVE
            )
        }
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

        val denominator =
            (sqrt(normA.toDouble()) * sqrt(normB.toDouble())).toFloat()
        val cosine = if (denominator > 0.0f) dotProduct / denominator else 0.0f
        return (cosine + 1.0f) / 2.0f
    }
}
