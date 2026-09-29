package com.telenko.filemanager.indexer

import java.io.File
import java.util.Locale

object DocumentResolver {

    private val TEXT_EXTENSIONS = setOf(
        "pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "md", "json", "csv", "xml", "html", "htm", "log", "epub"
    )

    fun isDocument(file: File): Boolean {
        val extension = file.extension.lowercase(Locale.ROOT)
        return TEXT_EXTENSIONS.contains(extension)
    }
}