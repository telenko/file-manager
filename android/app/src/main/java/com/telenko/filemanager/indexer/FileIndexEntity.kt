package com.telenko.filemanager.indexer

import io.objectbox.annotation.Convert
import io.objectbox.annotation.Entity
import io.objectbox.annotation.Id
import io.objectbox.annotation.Unique
import io.objectbox.annotation.ConflictStrategy
import io.objectbox.annotation.Index

@Entity
data class FileIndexEntity(
    @Id 
    var id: Long = 0,

    @Unique(onConflict = ConflictStrategy.REPLACE)
    var filePath: String = "",

    var fileName: String = "",

    @Convert(converter = MediaTypeConverter::class, dbType = String::class)
    var mediaType: MediaType = MediaType.OTHER,

    var lastModified: Long = 0L,

    var fileSize: Long = 0L,

    @Index
    var parentPath: String = ""
)