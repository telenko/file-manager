package com.telenko.filemanager.embeddings

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
    val embeddingType: String = EmbeddingType.IMAGE.name,
    val pageIndex: Int = 0,
    val frameTimeMs: Long = 0L
)

enum class EmbeddingType {
    IMAGE, // Вектор згенеровано візуальною моделлю (Vision/CLIP Image)
    NONE
}

/**
 * Контекст пошуку для розділення векторних просторів
 */
enum class SearchContext {
    VISUAL,
    TEXT,
    ALL
}