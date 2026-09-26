package com.telenko.filemanager.embeddings

import io.objectbox.annotation.Entity
import io.objectbox.annotation.Id
import io.objectbox.annotation.Index

@Entity
data class FileTextSnapshotEntity(
    @Id var id: Long = 0,

    @Index
    var filePath: String = "",

    var fileName: String = "",

    var pageIndex: Int = 0,

    var text: String = ""
)