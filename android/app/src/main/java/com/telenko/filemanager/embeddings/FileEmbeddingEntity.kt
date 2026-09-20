package com.telenko.filemanager.embeddings

import io.objectbox.annotation.Entity
import io.objectbox.annotation.HnswIndex
import io.objectbox.annotation.Id
import io.objectbox.annotation.Index
import io.objectbox.annotation.VectorDistanceType

@Entity
data class FileEmbeddingEntity(
    @Id var id: Long = 0,

    // Шлях до оригінального файлу (з B-Tree індексом для миттєвого Upsert)
    @Index var filePath: String = "",
    var fileName: String = "",

    // Зберігаємо назву Enum ("IMAGE", "PDF", "VIDEO", "TEXT")
    var mediaType: String = MediaType.IMAGE.name,

    // Тип ембеддінга ("IMAGE" або "TEXT")
    var embeddingType: String = EmbeddingType.IMAGE.name,

    // Контекстні поля
    var frameTimeMs: Long = 0L,  // Для відео: таймкод у мілісекундах
    var pageIndex: Int = 0,       // Для PDF: номер сторінки

    // Векторний індекс 512D
    @HnswIndex(dimensions = 512, distanceType = VectorDistanceType.COSINE)
    var embedding: FloatArray = FloatArray(0)
) {
    // Властивість-хелпер для зручного отримання MediaType у коді
    var type: MediaType
        get() = try {
            MediaType.valueOf(mediaType)
        } catch (e: Exception) {
            MediaType.IMAGE
        }
        set(value) {
            mediaType = value.name
        }

    // Властивість-хелпер для зручного отримання EmbeddingType у коді
    var typeEmbedding: EmbeddingType
        get() = try {
            EmbeddingType.valueOf(embeddingType)
        } catch (e: Exception) {
            EmbeddingType.IMAGE
        }
        set(value) {
            embeddingType = value.name
        }
}