package com.telenko.filemanager.picker

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PickerActivityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PickerActivityModule"
    }

    @ReactMethod
    fun handleSend(selectedDirUri: String) {
        val activity = currentActivity as PickerActivity
        activity.handleSend(selectedDirUri)
    }
}