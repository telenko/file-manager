package com.telenko.filemanager.thumbnail;

import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.util.Base64;

import java.io.ByteArrayOutputStream;

public class ThumbnailHelper {

    public static String createVideoThumbnail(String videoPath, Integer width) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        retriever.setDataSource(videoPath);
        Boolean needScale = width != null && width > 0;
        Bitmap bitmap = retriever.getFrameAtTime(1000000); // Get frame at 1 second (1000000 microseconds)
        if (bitmap == null) {
            return null;
        }
        // If both width and height are specified and width is greater than 0
        if (needScale) {
             // Calculate the aspect ratio of the original video frame
            float aspectRatio = (float) bitmap.getWidth() / (float) bitmap.getHeight();
            // Calculate the new height based on the aspect ratio and the specified width
            Integer height = Math.round(width / aspectRatio);
            bitmap = Bitmap.createScaledBitmap(bitmap, width, height, true);
        }
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        retriever.release();
        return Base64.encodeToString(byteArray, Base64.DEFAULT);
    }
}