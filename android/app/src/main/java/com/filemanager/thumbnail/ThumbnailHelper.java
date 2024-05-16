package com.filemanager.thumbnail;

import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.util.Base64;

import java.io.ByteArrayOutputStream;

public class ThumbnailHelper {

    public static String createVideoThumbnail(String videoPath) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        retriever.setDataSource(videoPath);
        Bitmap bitmap = retriever.getFrameAtTime(1000000); // Get frame at 1 second (1000000 microseconds)
        
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        retriever.release();
        return Base64.encodeToString(byteArray, Base64.DEFAULT);
    }
}