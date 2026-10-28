package com.telenko.filemanager.search.common

import com.telenko.filemanager.search.embeddings.FileEmbeddingEntity
import com.telenko.filemanager.search.snapshot.FileTextSnapshotEntity

enum class MediaType {
    IMAGE,
    PDF,
    VIDEO
}

data class ExtractionResult(
    val embeddings: List<FileEmbeddingEntity>,
    val snapshots: List<FileTextSnapshotEntity>
)

data class SearchResult(
    val filePath: String,
    val fileName: String,
    val score: Float,
    val mediaType: String,
    val pageIndex: Int = 0,
    val frameTimeMs: Long = 0L
)

/**
 * Контекст пошуку для розділення векторних просторів
 */
enum class SearchContext {
    VISUAL,
    TEXT,
    ALL
}