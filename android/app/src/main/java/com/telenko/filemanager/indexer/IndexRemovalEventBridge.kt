package com.telenko.filemanager.indexer

import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow

internal data class IndexRemovalEvent(
    val paths: List<String>
)

internal object IndexRemovalEventBridge {
    private val channel = Channel<IndexRemovalEvent>(Channel.UNLIMITED)
    val events = channel.receiveAsFlow()

    fun emit(event: IndexRemovalEvent) {
        check(channel.trySend(event).isSuccess)
    }
}