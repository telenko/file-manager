package com.filemanager.thumbnail;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;

public class ThumbnailModule extends ReactContextBaseJavaModule {
    public ThumbnailModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ThumbnailModule";
    }

    @ReactMethod
    public void createVideoThumbnail(String videoPath, Callback successCallback) {
        String base64Thumbnail = ThumbnailHelper.createVideoThumbnail(videoPath);
        successCallback.invoke(base64Thumbnail);
    }
}