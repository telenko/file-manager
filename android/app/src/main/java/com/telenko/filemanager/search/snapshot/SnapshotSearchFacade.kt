package com.telenko.filemanager.search.snapshot

import android.content.Context
import com.telenko.filemanager.db.ObjectBoxStore
import com.telenko.filemanager.infiniteapi.MediaType
import com.telenko.filemanager.search.common.SearchFacade
import com.telenko.filemanager.search.common.SearchFilter
import com.telenko.filemanager.search.common.SearchResult
import io.objectbox.Box
import io.objectbox.query.QueryBuilder

class SnapshotSearchFacade(
    context: Context,
    private val targetFolder: String? = null
) : SearchFacade<String> {

    companion object {
        const val searchFactor: Int = 40
    }

    override val searchFactor: Int = Companion.searchFactor

    private val box: Box<FileTextSnapshotEntity> =
        ObjectBoxStore.get(context).boxFor(FileTextSnapshotEntity::class.java)

    override fun search(query: String, filter: SearchFilter): List<SearchResult> {
        val tokens = tokenizeQuery(query)
        if (tokens.isEmpty()) return emptyList()

        val qb = box.query()
        applyFolderFilter(qb)

        if (filter.mediaTypes.isNotEmpty()) {
            var mediaFilterAdded = false
            filter.mediaTypes.forEach { mediaType ->
                if (mediaFilterAdded) qb.or()
                qb.equal(
                    FileTextSnapshotEntity_.mediaType,
                    mediaType.name,
                    QueryBuilder.StringOrder.CASE_SENSITIVE
                )
                mediaFilterAdded = true
            }
            qb.and()
        }

        tokens.forEachIndexed { index, token ->
            if (index > 0) qb.or()
            qb.contains(
                FileTextSnapshotEntity_.text,
                token,
                QueryBuilder.StringOrder.CASE_INSENSITIVE
            )
                .or()
                .contains(
                    FileTextSnapshotEntity_.fileName,
                    token,
                    QueryBuilder.StringOrder.CASE_INSENSITIVE
                )
        }

        return qb.build()
            .find()
            .map { snapshot ->
                val textContent = "${snapshot.text} ${snapshot.fileName}"
                SearchResult(
                    filePath = snapshot.filePath,
                    fileName = snapshot.fileName,
                    score = calculateTextMatchScore(tokens, textContent),
                    mediaType = snapshot.mediaType,
                    pageIndex = snapshot.pageIndex,
                    frameTimeMs = 0L
                )
            }
            .filter { it.score > 0.0f }
            .groupBy { it.filePath }
            .map { (_, results) -> results.maxByOrNull { it.score }!! }
            .sortedByDescending { it.score }
    }

    private fun applyFolderFilter(qb: QueryBuilder<FileTextSnapshotEntity>) {
        if (!targetFolder.isNullOrBlank()) {
            val formattedFolder =
                if (targetFolder.endsWith("/")) targetFolder else "$targetFolder/"
            qb.startsWith(
                FileTextSnapshotEntity_.filePath,
                formattedFolder,
                QueryBuilder.StringOrder.CASE_SENSITIVE
            )
        }
    }

    private fun tokenizeQuery(query: String): List<String> {
        if (query.isBlank()) return emptyList()
        return query
            .lowercase()
            .split("[\\s\\p{Punct}]+".toRegex())
            .filter { it.length > 1 }
            .distinct()
    }

    private fun calculateTextMatchScore(
        tokens: List<String>,
        textContent: String
    ): Float {
        if (tokens.isEmpty() || textContent.isBlank()) return 0.0f
        val textLower = textContent.lowercase()
        val matchedCount = tokens.count { textLower.contains(it) }
        return matchedCount.toFloat() / tokens.size.toFloat()
    }
}
