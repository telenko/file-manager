package com.telenko.filemanager.indexer

data class IndexerEvent(
    val name: String,
    val count: Int? = null,
    val removedPaths: List<String>? = null
)
