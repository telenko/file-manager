package com.telenko.filemanager.infiniteapi

interface PagedFileRepository {
    /**
     * Повертає список файлів порціями по [pageSize] (за замовчуванням 100).
     * [offset] визначає зсув для курсора/пагінації.
     */
    fun getFilesPaged(
        mediaTypes: List<MediaType>?, 
        offset: Long = 0, 
        pageSize: Int = 100
    ): List<UiFileEntity>
}