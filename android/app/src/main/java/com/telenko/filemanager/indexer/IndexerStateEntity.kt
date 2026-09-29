package com.telenko.filemanager.indexer

import io.objectbox.annotation.Entity
import io.objectbox.annotation.Id

@Entity
data class IndexerStateEntity(
    @Id var id: Long = 0, // В ObjectBox краще за замовчуванням ставити 0, щоб ORM сам виділяв ID
    var mediaLastModifiedDate: Long = 0L,
    var documentLastModifiedDate: Long = 0L,
    var isFirstScanCompleted: Boolean = false
)