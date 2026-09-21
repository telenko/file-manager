package com.telenko.filemanager.embeddings

import ai.onnxruntime.OrtSession
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.File
import android.content.Context
import android.util.Log

private const val TAG = "PdfEmbeddingIndexer" 

class PdfEmbeddingIndexer(
    private val imageIndexer: ImageEmbeddingIndexer,
    private val textIndexer: TextEmbeddingIndexer?,
    private val visualSession: OrtSession?,
    private val context: Context
) : MediaEmbeddingIndexer {

    override val mediaType: MediaType = MediaType.PDF

    override fun supports(filePath: String): Boolean {
        return filePath.endsWith(".pdf", ignoreCase = true)
    }

    override suspend fun indexFile(filePath: String): List<ExtractedEmbedding> = withContext(Dispatchers.IO) {
        val session = visualSession
            ?: throw IllegalStateException("Візуальна модель не ініціалізована!")

        val file = File(filePath)
        if (!file.exists()) {
            throw IllegalArgumentException("PDF файл не знайдено: $filePath")
        }

        val fileDescriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val pdfRenderer = PdfRenderer(fileDescriptor)

        val embeddings = mutableListOf<ExtractedEmbedding>()

        try {
            val pageCount = pdfRenderer.pageCount
            if (pageCount == 0) return@withContext emptyList()

            // 1 & 3. Обробляємо лише 1-шу та останню (якщо сторінок більше 1)
            val pagesToProcess = calculatePagesToProcess(pageCount)

            for (pageIndex in pagesToProcess) {
                // --- А. ВІЗУАЛЬНА ІНДЕКСАЦІЯ (IMAGE) ---
                val page = pdfRenderer.openPage(pageIndex)

                val width = page.width
                val height = page.height
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

                val canvas = android.graphics.Canvas(bitmap)
                canvas.drawColor(Color.WHITE)

                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                page.close()

                try {
                    val visualVector = imageIndexer.extractEmbeddingFromBitmap(bitmap, session)

                    embeddings.add(
                        ExtractedEmbedding(
                            vector = visualVector,
                            metadata = EmbeddingMetadata(
                                mediaType = mediaType,
                                embeddingType = EmbeddingType.IMAGE,
                                pageIndex = pageIndex
                            )
                        )
                    )
                } finally {
                    bitmap.recycle()
                }

                // --- Б. ТЕКСТОВА ІНДЕКСАЦІЯ (TEXT) ---
                if (textIndexer != null) {
                    val pageText = extractTextFromPage(file, pageIndex)
                    
                    val trimmedText = pageText.trim()
                    // Рахуємо кількість слів (розбиваємо за пробілами та переносами)
                    val wordCount = if (trimmedText.isBlank()) 0 else trimmedText.split("\\s+".toRegex()).size

                    // Перевіряємо поріг мінімальної кількості слів
                    if (wordCount >= MIN_WORD_COUNT) {
                        val limitedText = trimmedText.take(MAX_TEXT_LENGTH)
                        Log.d(TAG, "Extracted valid text from page $pageIndex ($wordCount words): $limitedText")

                        val textVector = textIndexer.getTextEmbedding(limitedText)
                        if (textVector.isNotEmpty()) {
                            embeddings.add(
                                ExtractedEmbedding(
                                    vector = textVector,
                                    metadata = EmbeddingMetadata(
                                        mediaType = mediaType,
                                        embeddingType = EmbeddingType.TEXT,
                                        pageIndex = pageIndex
                                    )
                                )
                            )
                        }
                    } else {
                        Log.d(TAG, "Skipping page $pageIndex: Text too short ($wordCount words, min $MIN_WORD_COUNT required)")
                    }
                }
            }
        } finally {
            pdfRenderer.close()
            fileDescriptor.close()
        }

        embeddings
    }

    private fun extractTextFromPage(file: File, pageIndex: Int): String {
        return try {
            PDDocument.load(file).use { document ->
                val stripper = PDFTextStripper().apply {
                    // Вказуємо конкретну сторінку (PDFBox використовує 1-based нумерацію)
                    startPage = pageIndex + 1
                    endPage = pageIndex + 1
                }
                stripper.getText(document) ?: ""
            }
        } catch (e: Exception) {
            ""
        }
    }

    /**
     * Алгоритм вибору сторінок:
     * - Якщо 1 сторінка -> [0]
     * - Якщо більше 1 -> перша [0] та остання [pageCount - 1]
     */
    private fun calculatePagesToProcess(pageCount: Int): List<Int> {
        if (pageCount <= 0) return emptyList()
        if (pageCount == 1) return listOf(0)

        return listOf(0, pageCount - 1)
    }

    companion object {
        private const val MAX_TEXT_LENGTH = 500
        private const val MIN_WORD_COUNT = 15 // Мінімальна кількість слів для створення текстового ембеддингу
    }
}