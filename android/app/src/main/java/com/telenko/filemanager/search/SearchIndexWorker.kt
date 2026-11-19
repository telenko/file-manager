package com.telenko.filemanager.search

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.telenko.filemanager.indexer.FileIndexEntity
import com.telenko.filemanager.indexer.FileIndexerFacade
import com.telenko.filemanager.MainApplication
import com.telenko.filemanager.indexer.SearchIndexMarkResult
import java.io.File
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

object SearchIndexWorkScheduler {
    private const val WORK_NAME = "search-file-indexing"

    fun enqueue(
        context: Context,
        replaceExisting: Boolean = false,
        appendIfRunning: Boolean = false
    ) {
        val appContext = context.applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val fileIndexer = FileIndexerFacade.getInstance(appContext)
                val pendingCount = fileIndexer.countPendingSearchIndexes()
                val totalCount = fileIndexer.countAllIndexes()
                val request = OneTimeWorkRequestBuilder<SearchIndexWorker>()
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                    .build()

                val policy = when {
                    replaceExisting -> ExistingWorkPolicy.REPLACE
                    appendIfRunning -> ExistingWorkPolicy.APPEND_OR_REPLACE
                    else -> ExistingWorkPolicy.KEEP
                }
                Log.i(
                    TAG,
                    "Scheduling search indexing: pending=$pendingCount/$totalCount, " +
                        "policy=$policy, workId=${request.id}"
                )
                WorkManager.getInstance(appContext).enqueueUniqueWork(WORK_NAME, policy, request)
            } catch (error: Exception) {
                Log.e(TAG, "Unable to schedule search indexing", error)
            }
        }
    }

    private const val TAG = "SearchIndexScheduler"
}

class SearchIndexWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.i(TAG, "Worker started: id=$id, attempt=${runAttemptCount + 1}")
        val fileIndexer = FileIndexerFacade.getInstance(applicationContext)
        val totalFileCount = fileIndexer.countAllIndexes()
        val pendingCount = fileIndexer.countPendingSearchIndexes()
        Log.i(TAG, "Indexing status: pending=$pendingCount, total=$totalFileCount")

        if (pendingCount == 0L) {
            if (totalFileCount == 0L) {
                Log.i(TAG, "No files found for search indexing, retry later")
                return@withContext Result.retry()
            }
            Log.i(TAG, "No files require search indexing")
            SearchIndexProgressEmitter.emit(applicationContext, 100, totalFileCount.toInt(), totalFileCount.toInt(), "completed")
            return@withContext Result.success()
        }

        if (!canRunWithCurrentBattery(pendingCount)) {
            Log.w(TAG, "Retrying search indexing because battery requirements are not met")
            return@withContext Result.retry()
        }
        try {
            val indexer = SearchIndexRuntimeProvider.getOrInitialize(applicationContext)
                .fileSearchIndexer

            Log.i(TAG, "Starting file indexing: batchSize=$BATCH_SIZE, delayBetweenBatchesMs=$BATCH_DELAY_MS")
            var completedBatches = 0
            var processedFilesInJob = 0
            var indexingFailed = false
            var batch = ArrayList<FileIndexEntity>(BATCH_SIZE)

            suspend fun processBatch(files: List<FileIndexEntity>) {
                if (completedBatches > 0) {
                    Log.d(TAG, "Waiting ${BATCH_DELAY_MS}ms before batch ${completedBatches + 1}")
                    delay(BATCH_DELAY_MS)
                }
                val batchNumber = completedBatches + 1
                Log.i(TAG, "Starting batch $batchNumber with ${files.size} files")
                var indexedInBatch = 0
                var changedDuringIndexing = 0
                for (entity in files) {
                    if (!canRunWithCurrentBattery(pendingCount)) {
                        Log.w(
                            TAG,
                            "Battery requirements no longer met during batch $batchNumber; " +
                                "indexedInBatch=$indexedInBatch"
                        )
                        throw BatteryConstraintException()
                    }
                    val indexed = indexer.indexFile(entity.filePath)
                    if (!indexed) {
                        Log.w(TAG, "Search indexing failed for ${entity.filePath}; it will be retried")
                        indexingFailed = true
                        continue
                    }

                    when (fileIndexer.markSearchIndexCompleted(entity, LAST_MODIFIED_TOLERANCE_MS)) {
                        SearchIndexMarkResult.UPDATED -> indexedInBatch++
                        SearchIndexMarkResult.CHANGED_DURING_INDEXING -> changedDuringIndexing++
                        SearchIndexMarkResult.ENTITY_MISSING -> Unit
                    }
                }
                processedFilesInJob += files.size

                completedBatches++
                val currentTotalFileCount = fileIndexer.countAllIndexes()
                val globallyIndexedFiles = fileIndexer.countCompletedSearchIndexes()
                val percentage = fileIndexer.searchIndexPercentage(globallyIndexedFiles, currentTotalFileCount)
                Log.i(
                    TAG,
                    "Finished batch $batchNumber: indexed=$indexedInBatch/${files.size}, " +
                        "changedOrRemoved=$changedDuringIndexing, globalProgress=$percentage% " +
                        "($globallyIndexedFiles/$currentTotalFileCount)"
                )
                SearchIndexProgressEmitter.emit(
                    applicationContext,
                    percentage,
                    globallyIndexedFiles.toInt(),
                    currentTotalFileCount.toInt(),
                    "running"
                )
                setProgress(
                    workDataOf(
                        "percentage" to percentage,
                        "indexedFiles" to globallyIndexedFiles.toInt(),
                        "totalFiles" to currentTotalFileCount.toInt()
                    )
                )
            }

            var offset = 0L
            while (offset < totalFileCount && processedFilesInJob < WORKER_JOB_SIZE) {
                val rows = fileIndexer.getSearchIndexPage(offset)
                if (rows.isEmpty()) break
                for (entity in rows) {
                    if (fileIndexer.isPendingSearchIndex(entity)) {
                        batch.add(entity)
                        val targetBatchSize = minOf(
                            BATCH_SIZE,
                            WORKER_JOB_SIZE - processedFilesInJob
                        )
                        if (batch.size == targetBatchSize) {
                            processBatch(batch)
                            batch = ArrayList(BATCH_SIZE)
                            if (processedFilesInJob >= WORKER_JOB_SIZE) break
                        }
                    }
                }
                offset += rows.size
            }
            if (batch.isNotEmpty() && processedFilesInJob < WORKER_JOB_SIZE) {
                processBatch(batch)
            }

            val currentTotalFileCount = fileIndexer.countAllIndexes()
            val globallyIndexedFiles = fileIndexer.countCompletedSearchIndexes()
            val remainingPendingFiles = fileIndexer.countPendingSearchIndexes()
            SearchIndexProgressEmitter.emit(
                applicationContext,
                fileIndexer.searchIndexPercentage(globallyIndexedFiles, currentTotalFileCount),
                globallyIndexedFiles.toInt(),
                currentTotalFileCount.toInt(),
                if (remainingPendingFiles == 0L) "completed" else "running"
            )
            return@withContext if (indexingFailed) {
                Log.w(
                    TAG,
                    "Indexing incomplete; retrying: failed=$indexingFailed, " +
                        "remainingPending=$remainingPendingFiles, batches=$completedBatches"
                )
                Result.retry()
            } else if (remainingPendingFiles > 0) {
                Log.i(
                    TAG,
                    "Worker chunk completed: processed=$processedFilesInJob/$WORKER_JOB_SIZE, " +
                        "remainingPending=$remainingPendingFiles; scheduling next chunk"
                )
                SearchIndexWorkScheduler.enqueue(
                    applicationContext,
                    appendIfRunning = true
                )
                Result.success()
            } else {
                Log.i(
                    TAG,
                    "Search indexing completed: indexed=$globallyIndexedFiles/$currentTotalFileCount, " +
                        "batches=$completedBatches"
                )
                Result.success()
            }
        } catch (_: BatteryConstraintException) {
            Log.w(TAG, "Retrying search indexing after battery constraint changed")
            return@withContext Result.retry()
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            Log.e(TAG, "Search indexing worker failed", error)
            return@withContext Result.retry()
        }
    }

    private fun canRunWithCurrentBattery(pendingCount: Long): Boolean {
        val battery = applicationContext.registerReceiver(
            null,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        ) ?: run {
            Log.w(TAG, "Unable to read battery status; delaying search indexing")
            return false
        }
        val level = battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        val status = battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL
        val batteryPercentage = if (scale > 0 && level >= 0) level * 100 / scale else null

        val canRun = if (pendingCount > LARGE_JOB_THRESHOLD) {
            isCharging || (batteryPercentage != null && batteryPercentage >= LARGE_JOB_MIN_BATTERY_PERCENT)
        } else {
            batteryPercentage != null && batteryPercentage >= MIN_BATTERY_PERCENT
        }
        if (!canRun) {
            val requiredCondition = if (pendingCount > LARGE_JOB_THRESHOLD) {
                "charging or minimum battery $LARGE_JOB_MIN_BATTERY_PERCENT% required for $pendingCount pending files"
            } else {
                "minimum battery $MIN_BATTERY_PERCENT% required for $pendingCount pending files"
            }
            Log.w(
                TAG,
                "Battery constraint not met: $requiredCondition, " +
                    "charging=$isCharging, level=${batteryPercentage?.let { "$it%" } ?: "unknown"}, status=$status"
            )
        }
        return canRun
    }

    companion object {
        private const val TAG = "SearchIndexWorker"
        private const val BATCH_SIZE = 25
        private const val BATCH_DELAY_MS = 3_000L
        private const val WORKER_JOB_SIZE = 300
        private val LAST_MODIFIED_TOLERANCE_MS = TimeUnit.SECONDS.toMillis(5)
        private const val LARGE_JOB_THRESHOLD = 100
        private const val LARGE_JOB_MIN_BATTERY_PERCENT = 65
        private const val MIN_BATTERY_PERCENT = 20

    }
}

private class BatteryConstraintException : Exception()

internal object SearchIndexProgressEmitter {
    const val PREFERENCES_NAME = "search_index_progress"
    private const val EVENT_NAME = "onSearchIndexProgress"

    fun emit(context: Context, percentage: Int, indexedFiles: Int, totalFiles: Int, status: String) {
        val safePercentage = percentage.coerceIn(0, 100)
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE).edit()
            .putInt("percentage", safePercentage)
            .putInt("indexedFiles", indexedFiles)
            .putInt("totalFiles", totalFiles)
            .putString("status", status)
            .apply()

        val application = context.applicationContext as? MainApplication ?: return
        val reactContext = application.reactNativeHost.reactInstanceManager.currentReactContext
            ?: return
        if (!reactContext.hasActiveCatalystInstance()) return

        val params = Arguments.createMap().apply {
            putInt("percentage", safePercentage)
            putInt("indexedFiles", indexedFiles)
            putInt("totalFiles", totalFiles)
            putString("status", status)
        }
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_NAME, params)
    }
}
