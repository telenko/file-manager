
package com.filemanager.viewer;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.ContentUris;
import android.net.Uri;
import androidx.core.content.FileProvider;
import android.webkit.MimeTypeMap;

import android.content.Context;
import android.database.Cursor;
import android.os.Environment;
import android.provider.MediaStore;
import android.media.MediaScannerConnection;
import android.util.Log;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.io.File;

public class LocalFileViewerModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private static final String SHOW_OPEN_WITH_DIALOG = "showOpenWithDialog" ;
    private static final String SHOW_STORE_SUGGESTIONS ="showAppsSuggestions";
    private static final String OPEN_EVENT = "LocalFileViewerDidOpen";
    private static final String DISMISS_EVENT = "LocalFileViewerDidDismiss";
    private static final Integer RN_FILE_VIEWER_REQUEST = 33341;

    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(final Activity activity, final int requestCode, final int resultCode, final Intent intent) {
            sendEvent(DISMISS_EVENT, requestCode - RN_FILE_VIEWER_REQUEST, null);
        }
    };

    public LocalFileViewerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(mActivityEventListener);
    }

    @ReactMethod
    public void open(String path, Integer currentId, ReadableMap options, String dialogTitle) {
        // Check if the file exists
        File file = new File(path);
        if (!file.exists()) {
            // File does not exist
            return;
        }

        // Get the MIME type of the file
        String mimeType = getMimeType(path);

        final Uri data = buildFileUri(path, mimeType);

        Boolean showOpenWithDialog = options.hasKey(SHOW_OPEN_WITH_DIALOG) ? options.getBoolean(SHOW_OPEN_WITH_DIALOG) : false;
        Boolean showStoreSuggestions = options.hasKey(SHOW_STORE_SUGGESTIONS) ? options.getBoolean(SHOW_STORE_SUGGESTIONS) : false;

        if(data == null) {
            sendEvent(OPEN_EVENT, currentId, "Invalid file");
            return;
        }

         Intent shareIntent = new Intent();
         shareIntent.setAction(Intent.ACTION_VIEW);
         shareIntent.addCategory("android.intent.category.DEFAULT");
         shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
         shareIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
         shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
         shareIntent.setDataAndType(data, mimeType);
         shareIntent.putExtra(Intent.EXTRA_STREAM, data);
         Intent intentActivity;

         if (showOpenWithDialog) {
             intentActivity = Intent.createChooser(shareIntent, dialogTitle);
         } else {
             intentActivity = shareIntent;
         }

         PackageManager pm = getCurrentActivity().getPackageManager();

         if (shareIntent.resolveActivity(pm) != null) {
             try {
                 getCurrentActivity().startActivityForResult(intentActivity, currentId + RN_FILE_VIEWER_REQUEST);
                 sendEvent(OPEN_EVENT, currentId, null);
             }
             catch(Exception e) {
                 sendEvent(OPEN_EVENT, currentId, e.getMessage());
             }
         } else {
             try {
                 if (showStoreSuggestions) {
                     if(mimeType == null) {
                         throw new Exception("It wasn't possible to detect the type of the file");
                     }
                     Intent storeIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=" + mimeType + "&c=apps"));
                     getCurrentActivity().startActivity(storeIntent);
                 }
                 throw new Exception("No app associated with this mime type");
             }
             catch(Exception e) {
                 sendEvent(OPEN_EVENT, currentId, e.getMessage());
             }
         }
    }

    @Override
    public String getName() {
        return "LocalFileViewer";
    }

    // Currently not in use
    private void openImageViaScanner(Context context, String filePath) {
        MediaScannerConnection.scanFile(
            context,
            new String[]{filePath},
            null,
            new MediaScannerConnection.OnScanCompletedListener() {
                @Override
                public void onScanCompleted(String path, Uri uri) {
                    if (uri != null) {
                        Log.i("Scanned", "Scanned image path: " + path);
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setDataAndType(uri, "image/*");
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                    }
                }
            });
    }

    private void sendEvent(String eventName, Integer currentId, String errorMessage) {
        WritableMap params = Arguments.createMap();
        params.putInt("id", currentId);
        if(errorMessage != null) {
            params.putString("error", errorMessage);
        }
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    private Uri buildFileUri(String filePath, String mimeType) {
        if (mimeType != null) {
            if (mimeType.startsWith("image/")) {
                return buildImageUri(filePath);
            } else if (mimeType.startsWith("video/")) {
                return buildVideoUri(filePath);
            } else if (mimeType.startsWith("audio/")) {
                return buildMusicUri(filePath);
            }
        }
        return buildNonMediaUri(filePath);
    }

     private Uri buildImageUri(String filePath) {
        String sortOrder = MediaStore.Images.Media.DISPLAY_NAME + " ASC";
         // Query the MediaStore to get the ID of the image file based on file path
         Cursor cursor = reactContext.getContentResolver().query(
                 MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                 new String[]{MediaStore.Images.Media._ID},
                 MediaStore.Images.Media.DATA + "=? AND " + MediaStore.Images.Media.DISPLAY_NAME + "=?",
                 new String[]{filePath, new File(filePath).getName()},
                 sortOrder
         );

         if (cursor != null && cursor.moveToFirst()) {
             long mediaId = cursor.getLong(cursor.getColumnIndex(MediaStore.Images.Media._ID));
             cursor.close();
             return ContentUris.withAppendedId(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL), mediaId);
         }
         return null;
     }

    private Uri buildVideoUri(String filePath) {
        // Query the MediaStore to get the ID of the media file
        Cursor cursor = reactContext.getContentResolver().query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                new String[]{MediaStore.Video.Media._ID},
                MediaStore.Video.Media.DATA + "=? AND " + MediaStore.Video.Media.DISPLAY_NAME + "=?",
                new String[]{filePath, new File(filePath).getName()},
                null
        );

        if (cursor != null && cursor.moveToFirst()) {
            long mediaId = cursor.getLong(cursor.getColumnIndex(MediaStore.Files.FileColumns._ID));
            cursor.close();
            return Uri.withAppendedPath(MediaStore.Files.getContentUri("external"), String.valueOf(mediaId));
        }
        return null;
    }

    private Uri buildMusicUri(String filePath) {
        // Query the MediaStore to get the ID of the media file
        Cursor cursor = reactContext.getContentResolver().query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                new String[]{MediaStore.Audio.Media._ID},
                MediaStore.Audio.Media.DATA + "=? AND " + MediaStore.Audio.Media.DISPLAY_NAME + "=?",
                new String[]{filePath, new File(filePath).getName()},
                null
        );

        if (cursor != null && cursor.moveToFirst()) {
            long mediaId = cursor.getLong(cursor.getColumnIndex(MediaStore.Files.FileColumns._ID));
            cursor.close();
            return Uri.withAppendedPath(MediaStore.Files.getContentUri("external"), String.valueOf(mediaId));
        }
        return null;
    }

    private Uri buildNonMediaUri(String filePath) {
        return FileProvider.getUriForFile(getCurrentActivity(), "com.filemanager.fileprovider", new File(filePath));
    }

    private String getMimeType(String filePath) {
        // Get the MIME type of the file based on its extension
        String extension = MimeTypeMap.getFileExtensionFromUrl(filePath);
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase());
    }

    @ReactMethod
    public void addListener(String eventName) { }

    @ReactMethod
    public void removeListeners(Integer count) { }
}
