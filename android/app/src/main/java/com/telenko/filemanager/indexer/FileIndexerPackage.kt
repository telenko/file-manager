package com.telenko.filemanager.indexer

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.telenko.filemanager.db.ObjectBoxStore
import com.telenko.filemanager.indexer.bridge.FileIndexerModule
import io.objectbox.Box

class FileIndexerPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        // Отримуємо BoxStore через get(reactContext) і витягуємо потрібний Box
        val store = ObjectBoxStore.get(reactContext)
        val fileIndexBox = store.boxFor(FileIndexEntity::class.java)
        val stateBox: Box<IndexerStateEntity> = store.boxFor(IndexerStateEntity::class.java) // 👈 Отримуємо Box для стану
        
        return listOf(
            FileIndexerModule(reactContext, fileIndexBox, stateBox)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}