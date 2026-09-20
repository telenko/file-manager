package com.telenko.filemanager.embeddings

import ai.onnxruntime.OrtSession
import android.media.MediaMetadataRetriever
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class VideoEmbeddingIndexer(
    private val imageIndexer: ImageEmbeddingIndexer,
    private val visualSession: OrtSession?
) : MediaEmbeddingIndexer {

    override val mediaType: MediaType = MediaType.VIDEO

    override fun supports(filePath: String): Boolean {
        val ext = filePath.substringAfterLast('.', "").lowercase()
        return ext in SUPPORTED_EXTENSIONS
    }

    override suspend fun indexFile(filePath: String): List<ExtractedEmbedding> = withContext(Dispatchers.IO) {
        val session = visualSession 
            ?: throw IllegalStateException("Візуальна модель не ініціалізована!")

        val file = File(filePath)
        if (!file.exists()) {
            throw IllegalArgumentException("Відео файл не знайдено: $filePath")
        }

        val embeddings = mutableListOf<ExtractedEmbedding>()
        val retriever = MediaMetadataRetriever()

        try {
            retriever.setDataSource(file.absolutePath)

            // Витягуємо тривалість відео у мілісекундах
            val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
            val durationMs = durationStr?.toLongOrNull() ?: 0L

            // Визначаємо таймкоди
            val timestamps = calculateTimestamps(durationMs)

            for (timeMs in timestamps) {
                // OPTION_CLOSEST_SYNC працює швидко (шукає найближчий keyframe)
                val bitmap = retriever.getFrameAtTime(
                    timeMs * 1000, 
                    MediaMetadataRetriever.OPTION_CLOSEST_SYNC
                )

                if (bitmap != null) {
                    try {
                        // Перевикористовуємо логіку інференсу зображень
                        val vector = imageIndexer.extractEmbeddingFromBitmap(bitmap, session)

                        embeddings.add(
                            ExtractedEmbedding(
                                vector = vector,
                                metadata = EmbeddingMetadata(
                                    mediaType = mediaType,
                                    frameTimeMs = timeMs
                                )
                            )
                        )
                    } finally {
                        bitmap.recycle() // Обов'язково вивільняємо оперативку
                    }
                }
            }
        } finally {
            retriever.release()
        }

        embeddings
    }

    /**
     * Розраховує 3 точки у часі:
     * - ~2 сек від початку
     * - середина
     * - ~2 сек від кінця
     */
    private fun calculateTimestamps(durationMs: Long): List<Long> {
        val offsetMs = 2000L // 2 секунди

        // Якщо відео коротше за 4 секунди — беремо лише 1 кадр по середині
        if (durationMs <= offsetMs * 2) {
            return listOf(durationMs / 2)
        }

        val startMs = offsetMs
        val midMs = durationMs / 2
        val endMs = durationMs - offsetMs

        return listOf(startMs, midMs, endMs)
    }

    companion object {
        private val SUPPORTED_EXTENSIONS = setOf("mp4", "mkv", "mov", "3gp", "avi", "webm")
    }
}