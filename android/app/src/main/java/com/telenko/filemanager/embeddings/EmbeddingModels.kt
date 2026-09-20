package com.telenko.filemanager.embeddings

enum class MediaType {
    IMAGE,
    PDF,
    VIDEO
}

/**
 * Модель результату генерації ембеддінгу.
 * Оскільки один файл (наприклад, відео або PDF) може містити декілька ембеддінгів 
 * (кадри/сторінки), генератор повертає список результатів.
 */
data class ExtractedEmbedding(
    val vector: FloatArray,
    val metadata: EmbeddingMetadata
)

data class EmbeddingMetadata(
    val mediaType: MediaType = MediaType.IMAGE,
    val embeddingType: EmbeddingType = EmbeddingType.IMAGE, // Додали поле
    val pageIndex: Int = 0,
    val frameTimeMs: Long = 0L
)

data class SearchResult(
    val filePath: String,
    val fileName: String,
    val score: Float,
    val mediaType: String,
    val embeddingType: String = EmbeddingType.IMAGE.name, // Додали поле
    val pageIndex: Int = 0,
    val frameTimeMs: Long = 0L
)

enum class EmbeddingType {
    IMAGE, // Вектор згенеровано візуальною моделлю (Vision/CLIP Image)
    TEXT   // Вектор згенеровано текстовою моделлю (CLIP Text або Text Embedder)
}