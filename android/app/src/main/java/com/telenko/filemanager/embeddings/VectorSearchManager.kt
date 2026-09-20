package com.telenko.filemanager.embeddings

import android.content.Context
import io.objectbox.Box
import io.objectbox.query.QueryBuilder
import kotlin.math.sqrt

class VectorSearchManager(context: Context) {

    private val box: Box<FileEmbeddingEntity> = ObjectBoxStore.get(context).boxFor(FileEmbeddingEntity::class.java)

    fun upsertEmbedding(
        filePath: String,
        fileName: String,
        vector: FloatArray,
        metadata: EmbeddingMetadata
    ) {
        val existing = box.query()
            .equal(FileEmbeddingEntity_.filePath, filePath, QueryBuilder.StringOrder.CASE_SENSITIVE)
            .equal(FileEmbeddingEntity_.pageIndex, metadata.pageIndex.toLong())
            .equal(FileEmbeddingEntity_.frameTimeMs, metadata.frameTimeMs)
            .build()
            .findFirst()

        if (existing != null) {
            existing.embedding = vector
            existing.mediaType = metadata.mediaType.name
            box.put(existing)
        } else {
            val entity = FileEmbeddingEntity(
                filePath = filePath,
                fileName = fileName,
                embedding = vector,
                mediaType = metadata.mediaType.name,
                pageIndex = metadata.pageIndex,
                frameTimeMs = metadata.frameTimeMs
            )
            box.put(entity)
        }
    }

    /**
     * Пошук Top-K релевантних файлів.
     * @param targetFolder Якщо вказано, шукає лише файли у цій папці та її підпапках.
     */
    fun searchTopK(
        queryVector: FloatArray,
        topK: Int = 10,
        targetFolder: String? = null
    ): List<SearchResult> {
        val queryBuilder = box.query()

        if (!targetFolder.isNullOrBlank()) {
            val formattedFolder = if (targetFolder.endsWith("/")) targetFolder else "$targetFolder/"
            queryBuilder.startsWith(FileEmbeddingEntity_.filePath, formattedFolder, QueryBuilder.StringOrder.CASE_SENSITIVE)
        }

        val allEntities = queryBuilder.build().find()
        if (allEntities.isEmpty()) return emptyList()

        val scoredResults = allEntities.map { entity ->
            val similarity = cosineSimilarity(queryVector, entity.embedding)
            SearchResult(
                filePath = entity.filePath,
                fileName = entity.fileName,
                score = similarity,
                mediaType = entity.mediaType,
                pageIndex = entity.pageIndex,
                frameTimeMs = entity.frameTimeMs
            )
        }

        return scoredResults
            .groupBy { it.filePath }
            .mapValues { (_, results) -> results.maxByOrNull { it.score }!! }
            .values
            .sortedByDescending { it.score }
            .take(topK)
    }

    private fun cosineSimilarity(v1: FloatArray, v2: FloatArray): Float {
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