package com.telenko.filemanager.indexer

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore

class MediaContentObserver(
    private val context: Context,
    handler: Handler = Handler(Looper.getMainLooper()),
    private val onChangeTriggered: (Uri?) -> Unit
) : ContentObserver(handler) {

    fun register() {
        val resolver = context.contentResolver
        // Підписуємося на зміни у фото, відео та аудіо
        resolver.registerContentObserver(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, this)
        resolver.registerContentObserver(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, this)
        resolver.registerContentObserver(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, true, this)
    }

    fun unregister() {
        context.contentResolver.unregisterContentObserver(this)
    }

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        super.onChange(selfChange, uri)
        onChangeTriggered(uri)
    }
}