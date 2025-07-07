package com.telenko.filemanager
 
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.telenko.filemanager.fspermissions.PermissionFilePackage
import com.telenko.filemanager.viewer.LocalFileViewerPackage
import com.telenko.filemanager.thumbnail.ThumbnailPackage
import com.telenko.filemanager.storage.StorageMetaReaderPackage
import com.telenko.filemanager.picker.PickerActivityPackage
 
class MainApplication : Application(), ReactApplication {
 
  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(PermissionFilePackage());
              add(LocalFileViewerPackage());
              add(ThumbnailPackage());
              add(StorageMetaReaderPackage());
              add(PickerActivityPackage());
            }
 
        override fun getJSMainModuleName(): String = "index"
 
        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
 
        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
 
  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)
 
  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}