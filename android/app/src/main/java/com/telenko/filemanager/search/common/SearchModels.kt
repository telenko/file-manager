package com.telenko.filemanager.search.common

import com.telenko.filemanager.search.embeddings.FileEmbeddingEntity
import com.telenko.filemanager.search.snapshot.FileTextSnapshotEntity
import com.telenko.filemanager.infiniteapi.MediaType

data class ExtractionResult(
    val embeddings: List<FileEmbeddingEntity>,
    val snapshots: List<FileTextSnapshotEntity>
)

data class SearchResult(
    val filePath: String,
    val fileName: String,
    val score: Float,
    val mediaType: String,
    val pageIndex: Int = 0,
    val frameTimeMs: Long = 0L
)

data class SearchFilter(
    val mediaTypes: List<MediaType> = emptyList()
)

interface SearchFacade<Q> {
    val searchFactor: Int

    fun search(query: Q, filter: SearchFilter): List<SearchResult>
}