package com.telenko.filemanager.embeddings

import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.Log
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import com.tom_roush.pdfbox.text.TextPosition
import io.objectbox.Box
import io.objectbox.query.QueryBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

private const val TAG = "PdfEmbeddingIndexer"

class PdfEmbeddingIndexer(
    private val context: Context
) : MediaEmbeddingIndexer {

    override val mediaType: MediaType = MediaType.PDF

    private val snapshotBox: Box<FileTextSnapshotEntity> by lazy {
        ObjectBoxStore.get(context).boxFor(FileTextSnapshotEntity::class.java)
    }

    override fun supports(filePath: String): Boolean {
        return filePath.endsWith(".pdf", ignoreCase = true)
    }

    override suspend fun indexFile(filePath: String): ExtractionResult = withContext(Dispatchers.IO) {
        val file = File(filePath)
        if (!file.exists()) {
            throw IllegalArgumentException("PDF файл не знайдено: $filePath")
        }
        Log.d(TAG, "Starting indexing for PDF file: $filePath")
        val snapshots = mutableListOf<FileTextSnapshotEntity>()

        // 1. ЕМБЕДДІНГ НАЗВИ ФАЙЛУ (EmbeddingType.FILENAME)
        val cleanFileName = extractCleanFileName(file.name)
        if (cleanFileName.isNotBlank()) {
            Log.d(TAG, "Extracted filename embedding for $cleanFileName")
            snapshots.add(
                FileTextSnapshotEntity(
                    filePath = filePath,
                    fileName = file.name,
                    pageIndex = -1,
                    text = cleanFileName
                )
            )
        }

        val fileDescriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val pdfRenderer = PdfRenderer(fileDescriptor)

        try {
            val pageCount = pdfRenderer.pageCount
            if (pageCount == 0) return@withContext ExtractionResult(embeddings = emptyList(), snapshots = emptyList())
            val pagesToProcess = calculatePagesToProcess(pageCount)

            // Обробимо кожну вибрану сторінку
            for (pageIndex in pagesToProcess) {
                val textSnapshot = extractPageTextSnapshot(file, pageIndex, MAX_SNAPSHOT_CHARS)
                Log.d(TAG, "1st 30 chars of text snapshot for page $pageIndex: ${textSnapshot.take(30)}")
                if (textSnapshot.isNotBlank()) {
                    snapshots.add(
                        FileTextSnapshotEntity(
                            filePath = filePath,
                            fileName = file.name,
                            pageIndex = pageIndex,
                            text = textSnapshot
                        )
                    )
                }
            }
        } finally {
            pdfRenderer.close()
            fileDescriptor.close()
        }
        ExtractionResult(
            embeddings = emptyList(), // PDF не має власних векторів, лише текстові знімки
            snapshots = snapshots
        )
    }

    private fun extractPageTextSnapshot(file: File, pageIndex: Int, maxChars: Int): String {
        return try {
            PDDocument.load(file).use { document ->
                val stripper = PDFTextStripper().apply {
                    startPage = pageIndex + 1
                    endPage = pageIndex + 1
                }
                val rawText = stripper.getText(document).trim()
                rawText.take(maxChars)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting text snapshot for page $pageIndex", e)
            ""
        }
    }

    private fun extractCleanFileName(fileNameWithExtension: String): String {
        val nameWithoutExtension = fileNameWithExtension.substringBeforeLast('.')
        return nameWithoutExtension
            .replace("[_\\-\\.\\,\\;\\:\\/\\\\|]+".toRegex(), " ")
            .split("\\s+".toRegex())
            .filter { it.isNotBlank() }
            .joinToString(" ")
    }

    private fun calculatePagesToProcess(pageCount: Int): List<Int> {
        if (pageCount <= 0) return emptyList()
        if (pageCount == 1) return listOf(0)
        return listOf(0, pageCount - 1)
    }

    companion object {
        private const val MAX_SNAPSHOT_CHARS = 300
    }
}