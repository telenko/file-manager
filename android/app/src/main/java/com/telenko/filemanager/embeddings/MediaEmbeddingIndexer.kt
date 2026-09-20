package com.telenko.filemanager.embeddings

interface MediaEmbeddingIndexer {
    /**
     * Тип медіа, який обробляє цей індексатор.
     */
    val mediaType: MediaType

    /**
     * Перевіряє, чи підтримує даний індексатор конкретний файл за його розширенням або шляхом.
     */
    fun supports(filePath: String): Boolean

    /**
     * Витягує один або декілька векторів (з метаданими) з файлу.
     * 
     * @param filePath Повний шлях до файлу.
     * @return Список згенерованих векторів `ExtractedEmbedding`.
     */
    suspend fun indexFile(filePath: String): List<ExtractedEmbedding>
}