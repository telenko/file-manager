package com.filemanager.storage;

import android.content.Context;
import android.os.Environment;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.io.File;
import java.util.ArrayList;

public class StorageMetaReaderModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public StorageMetaReaderModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "StorageMetaReader";
    }

    @ReactMethod
    public void readAll(Promise promise) {
        try {
            WritableArray storagesArray = new WritableNativeArray();
            ArrayList<String> rootPaths = new ArrayList<>();
            Context context = getReactApplicationContext();
            File[] rootsStorage = ContextCompat.getExternalFilesDirs(context, null);

            for (File rootStorage : rootsStorage) {
                String root = rootStorage.getAbsolutePath().replace("/Android/data/" + context.getPackageName() + "/files", "");
                rootPaths.add(root);

                WritableMap storageMap = new WritableNativeMap();
                storageMap.putString("path", root);
                storageMap.putString("name", rootStorage.getName());
                storageMap.putDouble("freeSpace", (double) new File(root).getFreeSpace());
                storageMap.putDouble("totalSpace", (double) new File(root).getTotalSpace());
                storageMap.putBoolean("isMainDeviceStorage", root.equals(Environment.getExternalStorageDirectory().getAbsolutePath()));
                storageMap.putBoolean("isSdCardStorage", !root.equals(Environment.getExternalStorageDirectory().getAbsolutePath()));

                storagesArray.pushMap(storageMap);
            }

            promise.resolve(storagesArray);
        } catch (Exception e) {
            promise.reject("Error", e);
        }
    }
}
