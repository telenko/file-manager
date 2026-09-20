package com.telenko.filemanager.embeddings

import android.content.Context
import io.objectbox.BoxStore

object ObjectBoxStore {
    @Volatile
    private var boxStore: BoxStore? = null

    fun get(context: Context): BoxStore {
        return boxStore ?: synchronized(this) {
            boxStore ?: MyObjectBox.builder()
                .androidContext(context.applicationContext)
                .build()
                .also { boxStore = it }
        }
    }
}