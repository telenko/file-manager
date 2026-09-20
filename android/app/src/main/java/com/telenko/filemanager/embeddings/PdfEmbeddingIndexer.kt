package com.telenko.filemanager.embeddings

import ai.onnxruntime.OrtSession
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class PdfEmbeddingIndexer(
    private val imageIndexer: ImageEmbeddingIndexer,
    private val textIndexer: TextEmbeddingIndexer?,
    private val visualSession: OrtSession?
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
                    
                    // 2. Обмежуємо текст максимум до 500 символів
                    val trimmedText = pageText.trim().take(MAX_TEXT_LENGTH)

                    if (trimmedText.isNotBlank()) {
                        val textVector = textIndexer.getTextEmbedding(trimmedText)
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
        var pdfiumCore: com.shockwave.pdfium.PdfiumCore? = null
        var pdfDocument: com.shockwave.pdfium.PdfDocument? = null
        
        return try {
            pdfiumCore = com.shockwave.pdfium.PdfiumCore(context)
            val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            pdfDocument = pdfiumCore.newDocument(pfd)

            pdfiumCore.openPage(pdfDocument, pageIndex)
            
            // Витягуємо текст зі сторінки
            val text = pdfiumCore.extractText(pdfDocument, pageIndex)
            
            text ?: ""
        } catch (e: Exception) {
            ""
        } finally {
            try {
                if (pdfDocument != null && pdfiumCore != null) {
                    pdfiumCore.closeDocument(pdfDocument)
                }
            } catch (_: Exception) {}
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
    }
}