package com.telenko.filemanager.search.snapshot

import io.objectbox.annotation.Entity
import io.objectbox.annotation.Id
import io.objectbox.annotation.Index
import com.telenko.filemanager.infiniteapi.MediaType

enum class SnapshotType {
    TEXT_CONTENT,
    FILE_NAME
}

@Entity
data class FileTextSnapshotEntity(
    @Id var id: Long = 0,

    @Index
    var filePath: String = "",

    var fileName: String = "",

    var pageIndex: Int = 0,

    var text: String = "",

    var mediaType: String = MediaType.TEXT.name,

    var snapshotType: String = SnapshotType.TEXT_CONTENT.name
) {
    var type: SnapshotType
        get() = try {
            SnapshotType.valueOf(snapshotType)
        } catch (e: IllegalArgumentException) {
            SnapshotType.TEXT_CONTENT
        }
        set(value) {
            snapshotType = value.name
        }
}