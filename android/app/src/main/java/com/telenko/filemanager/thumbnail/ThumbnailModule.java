package com.telenko.filemanager.thumbnail;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ThumbnailModule extends ReactContextBaseJavaModule {

    private final ExecutorService executorService;

    public ThumbnailModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.executorService = Executors.newFixedThreadPool(10);
    }

    @Override
    public String getName() {
        return "ThumbnailModule";
    }

    @ReactMethod
    public void createVideoThumbnail(String videoPath, Integer width, Callback successCallback, Callback errorCallback) {
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String base64Thumbnail = ThumbnailHelper.createVideoThumbnail(videoPath, width);
                    if (base64Thumbnail == null) {
                        errorCallback.invoke("Failed to decode 1st second from video");
                    } else {
                        successCallback.invoke(base64Thumbnail);
                    }
                } catch (Exception e) {
                    errorCallback.invoke(e.getMessage());
                }
            }
        });
    }
}