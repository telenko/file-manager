package com.telenko.filemanager.embeddings

import io.objectbox.annotation.Entity
import io.objectbox.annotation.HnswIndex
import io.objectbox.annotation.Id
import io.objectbox.annotation.Index
import io.objectbox.annotation.VectorDistanceType

@Entity
data class FileEmbeddingEntity(
    @Id var id: Long = 0,

    @Index var filePath: String = "",
    var fileName: String = "",

    var mediaType: String = MediaType.IMAGE.name,
    var embeddingType: String = EmbeddingType.IMAGE.name,

    var frameTimeMs: Long = 0L,  // Для відео
    var pageIndex: Int = 0,       // Для PDF (-1 для FILENAME)

    @HnswIndex(dimensions = 512, distanceType = VectorDistanceType.COSINE)
    var embedding: FloatArray = FloatArray(0)
) {
    var type: MediaType
        get() = try { MediaType.valueOf(mediaType) } catch (e: Exception) { MediaType.IMAGE }
        set(value) { mediaType = value.name }

    var typeEmbedding: EmbeddingType
        get() = try { EmbeddingType.valueOf(embeddingType) } catch (e: Exception) { EmbeddingType.IMAGE }
        set(value) { embeddingType = value.name }
}