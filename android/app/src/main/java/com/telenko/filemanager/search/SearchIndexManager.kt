package com.telenko.filemanager.search

import android.content.Context
import android.util.Log
import com.telenko.filemanager.search.common.SearchResult
import com.telenko.filemanager.search.common.SearchFilter
import com.telenko.filemanager.search.embeddings.VisualSearchFacade
import com.telenko.filemanager.search.snapshot.SnapshotSearchFacade

private const val TAG = "SearchIndexManager"

class SearchIndexManager(private val context: Context) {

    fun searchTopK(
        queryVector: FloatArray,
        queryText: String,
        filter: SearchFilter,
        offset: Int = 0,
        size: Int = 50,
        targetFolder: String? = null
    ): List<SearchResult> {
        Log.d(
            TAG,
            "Search: '$queryText' | Media types: ${filter.mediaTypes} | Offset: $offset, Size: $size"
        )

        val visualFacade = VisualSearchFacade(context = context, targetFolder = targetFolder)
        val snapshotFacade = SnapshotSearchFacade(context = context, targetFolder = targetFolder)

        val facadeResults = listOf(
            visualFacade.search(queryVector, filter).let { visualFacade.searchFactor to it },
            snapshotFacade.search(queryText, filter).let { snapshotFacade.searchFactor to it }
        )

        val combinedResults = combineResults(facadeResults)
        return paginate(combinedResults, offset, size)
    }

    private fun combineResults(
        facadeResults: List<Pair<Int, List<SearchResult>>>
    ): List<SearchResult> {
        val positiveFactorSum = facadeResults.sumOf { (factor, _) ->
            factor.coerceAtLeast(0)
        }.toFloat()
        if (positiveFactorSum <= 0.0f) return emptyList()

        val combinedByFile = mutableMapOf<String, CombinedResult>()
        for ((factor, results) in facadeResults) {
            val weight = factor.coerceAtLeast(0).toFloat() / positiveFactorSum
            for (result in results) {
                val current = combinedByFile[result.filePath]
                val combinedScore =
                    (current?.score ?: 0.0f) + result.score.coerceIn(0.0f, 1.0f) * weight

                combinedByFile[result.filePath] = CombinedResult(
                    filePath = result.filePath,
                    fileName = result.fileName,
                    score = combinedScore.coerceIn(0.0f, 1.0f),
                    mediaType = current?.mediaType ?: result.mediaType,
                    pageIndex = current?.pageIndex ?: result.pageIndex,
                    frameTimeMs = current?.frameTimeMs ?: result.frameTimeMs
                )
            }
        }

        return combinedByFile.values
            .map {
                SearchResult(
                    filePath = it.filePath,
                    fileName = it.fileName,
                    score = it.score,
                    mediaType = it.mediaType,
                    pageIndex = it.pageIndex,
                    frameTimeMs = it.frameTimeMs
                )
            }
            .sortedWith(
                compareByDescending<SearchResult> { it.score }
                    .thenBy { it.filePath }
            )
    }

    private fun paginate(
        results: List<SearchResult>,
        offset: Int,
        size: Int
    ): List<SearchResult> {
        if (offset >= results.size || size <= 0) return emptyList()
        val endIdx = minOf(offset + size, results.size)
        return results.subList(offset, endIdx)
    }

    private data class CombinedResult(
        val filePath: String,
        val fileName: String,
        val score: Float,
        val mediaType: String,
        val pageIndex: Int,
        val frameTimeMs: Long
    )
}
