package com.telenko.filemanager.infiniteapi

data class UiFileEntity(
    val filePath: String,
    val lastModified: Long,
    val mediaType: MediaType
)