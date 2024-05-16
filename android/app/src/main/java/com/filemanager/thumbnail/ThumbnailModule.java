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
    public void createVideoThumbnail(String videoPath, Callback successCallback, Callback errorCallback) {
        try {
            String base64Thumbnail = ThumbnailHelper.createVideoThumbnail(videoPath);
            if (base64Thumbnail == null) {
                errorCallback.invoke("failed to decode 1st second from video");
            } else {
                successCallback.invoke(base64Thumbnail);
            }
        } catch (Exception e) {
            errorCallback.invoke(e.getMessage());
        }
    }
}