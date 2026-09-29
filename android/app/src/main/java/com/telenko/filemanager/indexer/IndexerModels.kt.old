package com.telenko.filemanager.indexer

import io.objectbox.converter.PropertyConverter

enum class MediaType {
    IMAGE,      // Зображення (.jpg, .png, .webp, .heic і т.д.)
    VIDEO,      // Відео (.mp4, .mkv, .avi і т.д.)
    MUSIC,      // Музичний / Аудіо (.mp3, .flac, .wav, .aac і т.д.)
    TEXT,       // Текстовий (.txt, .pdf, .md, .doc, .json і т.д.)
    OTHER       // Для системних/інших файлів, якщо вони попадають у вибірку
}



class MediaTypeConverter : PropertyConverter<MediaType, String> {
    override fun convertToEntityProperty(databaseValue: String?): MediaType {
        if (databaseValue == null) return MediaType.OTHER
        return try {
            MediaType.valueOf(databaseValue)
        } catch (e: IllegalArgumentException) {
            MediaType.OTHER
        }
    }

    override fun convertToDatabaseValue(entityProperty: MediaType?): String {
        return entityProperty?.name ?: MediaType.OTHER.name
    }
}