package com.telenko.filemanager.infiniteapi

import android.webkit.MimeTypeMap
import java.io.File
import java.util.Locale

object MediaTypeResolver {

    private val IMAGE_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "svg")
    private val VIDEO_EXTENSIONS = setOf("mp4", "mkv", "webm", "avi", "mov", "3gp", "m4v", "flv", "ts")
    private val MUSIC_EXTENSIONS = setOf("mp3", "flac", "wav", "aac", "ogg", "m4a", "wma", "opus", "amr")
    private val TEXT_EXTENSIONS = setOf("txt", "pdf", "md", "doc", "docx", "json", "csv", "xml", "html", "htm", "log", "epub")

    fun resolve(file: File): MediaType {
        val extension = file.extension.lowercase(Locale.ROOT)
        if (extension.isEmpty()) return MediaType.OTHER

        return when {
            IMAGE_EXTENSIONS.contains(extension) -> MediaType.IMAGE
            VIDEO_EXTENSIONS.contains(extension) -> MediaType.VIDEO
            MUSIC_EXTENSIONS.contains(extension) -> MediaType.MUSIC
            TEXT_EXTENSIONS.contains(extension) -> MediaType.TEXT
            else -> resolveByMimeType(extension)
        }
    }

    private fun resolveByMimeType(extension: String): MediaType {
        val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) 
            ?: return MediaType.OTHER

        return when {
            mimeType.startsWith("image/") -> MediaType.IMAGE
            mimeType.startsWith("video/") -> MediaType.VIDEO
            mimeType.startsWith("audio/") -> MediaType.MUSIC
            mimeType.startsWith("text/") || mimeType == "application/pdf" -> MediaType.TEXT
            else -> MediaType.OTHER
        }
    }

    fun isDocument(file: File): Boolean {
        return resolve(file) == MediaType.TEXT
    }
}