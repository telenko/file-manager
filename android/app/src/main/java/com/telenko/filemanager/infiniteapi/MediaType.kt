package com.telenko.filemanager.infiniteapi

import io.objectbox.converter.PropertyConverter

enum class MediaType {
    IMAGE,
    VIDEO,
    MUSIC,
    TEXT,
    OTHER
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