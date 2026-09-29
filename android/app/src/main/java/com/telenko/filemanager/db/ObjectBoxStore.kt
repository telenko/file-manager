package com.telenko.filemanager.db

import android.content.Context
import io.objectbox.BoxStore

object ObjectBoxStore {
    @Volatile
    private var boxStore: BoxStore? = null

    fun get(context: Context): BoxStore {
        val existingStore = boxStore
        if (existingStore != null) {
            return existingStore
        }

        return synchronized(this) {
            val store = boxStore ?: com.telenko.filemanager.MyObjectBox.builder()
                .androidContext(context.applicationContext)
                .build()
            boxStore = store
            store
        }
    }
}