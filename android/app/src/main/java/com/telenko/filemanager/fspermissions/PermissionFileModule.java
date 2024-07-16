package com.telenko.filemanager.fspermissions;

import static android.Manifest.permission.WRITE_EXTERNAL_STORAGE;
import static android.Manifest.permission.READ_EXTERNAL_STORAGE;

import android.os.Build;
import android.os.Environment;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.widget.Toast;
import android.app.Activity;
import android.net.Uri;
import android.provider.Settings;

import androidx.annotation.Nullable;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.app.ActivityCompat;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.uimanager.IllegalViewOperationException;

public class PermissionFileModule extends ReactContextBaseJavaModule implements ActivityEventListener, LifecycleEventListener {

    private static final int REQUEST_CODE_ALL_FILES_ACCESS = 2296;
    private static final int REQUEST_CODE_STORAGE_PERMISSION = 100;

    private Callback pendingSuccessCallback = null;
    private Callback pendingErrorCallback = null;
    private boolean requestPending = false;

    public PermissionFileModule(@Nullable ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);
        reactContext.addLifecycleEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return "PermissionFile";
    }

    @ReactMethod
    public void checkAndGrantPermission(Callback errorCallback, Callback successCallback) {
        try {
            if (checkPermission()) {
                successCallback.invoke(true);
            } else {
                pendingSuccessCallback = successCallback;
                pendingErrorCallback = errorCallback;
                if (!requestPermission()) {
                    requestPending = true;
                }
            }
        } catch (IllegalViewOperationException e) {
            errorCallback.invoke(e.getMessage());
        }
    }

    private boolean checkPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        } else {
            int result = ContextCompat.checkSelfPermission(getReactApplicationContext(), READ_EXTERNAL_STORAGE);
            int result1 = ContextCompat.checkSelfPermission(getReactApplicationContext(), WRITE_EXTERNAL_STORAGE);
            return result == PackageManager.PERMISSION_GRANTED && result1 == PackageManager.PERMISSION_GRANTED;
        }
    }

    private boolean requestPermission() {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            return false;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.addCategory("android.intent.category.DEFAULT");
                intent.setData(Uri.parse(String.format("package:%s", getReactApplicationContext().getPackageName())));
                currentActivity.startActivityForResult(intent, REQUEST_CODE_ALL_FILES_ACCESS);
            } catch (Exception e) {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                currentActivity.startActivityForResult(intent, REQUEST_CODE_ALL_FILES_ACCESS);
            }
        } else {
            // Below Android 11
            ActivityCompat.requestPermissions(currentActivity, new String[]{WRITE_EXTERNAL_STORAGE}, REQUEST_CODE_STORAGE_PERMISSION);
        }
        return true;
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_CODE_ALL_FILES_ACCESS) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (Environment.isExternalStorageManager()) {
                    Toast.makeText(getReactApplicationContext(), "Access granted", Toast.LENGTH_SHORT).show();
                    if (pendingSuccessCallback != null) {
                        pendingSuccessCallback.invoke(true);
                    }
                } else {
                    Toast.makeText(getReactApplicationContext(), "Access not granted", Toast.LENGTH_SHORT).show();
                    if (pendingSuccessCallback != null) {
                        pendingSuccessCallback.invoke(false);
                    }
                }
                clearPendingCallbacks();
            }
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        // Do nothing
    }

    @Override
    public void onHostResume() {
        if (requestPending) {
            requestPending = false;
            requestPermission();
        }
    }

    @Override
    public void onHostPause() {
        // Do nothing
    }

    @Override
    public void onHostDestroy() {
        // Do nothing
    }

    private void clearPendingCallbacks() {
        pendingSuccessCallback = null;
        pendingErrorCallback = null;
    }
}