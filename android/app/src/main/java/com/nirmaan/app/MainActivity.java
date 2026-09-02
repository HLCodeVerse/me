package com.nirmaan.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure WebView display settings and attach Native Audio Interface
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setUseWideViewPort(false);
            settings.setLoadWithOverviewMode(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            // Expose native JavascriptInterface for instant device audio discovery
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public String getDeviceMusic() {
                    return scanNativeDeviceAudioFiles();
                }
            }, "AndroidNativeAudio");
        }

        // Request all mobile permissions on launch at APK Native OS level
        requestNativeAppPermissions();
    }

    private String scanNativeDeviceAudioFiles() {
        JSONArray tracks = new JSONArray();
        try {
            ContentResolver contentResolver = getContentResolver();
            Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";
            String sortOrder = MediaStore.Audio.Media.TITLE + " ASC";

            Cursor cursor = contentResolver.query(uri, null, selection, null, sortOrder);

            if (cursor != null && cursor.moveToFirst()) {
                int titleCol = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                int artistCol = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                int albumCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                int dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);
                int durationCol = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);
                int idCol = cursor.getColumnIndex(MediaStore.Audio.Media._ID);

                do {
                    JSONObject track = new JSONObject();
                    String title = titleCol >= 0 ? cursor.getString(titleCol) : "Unknown Track";
                    String artist = artistCol >= 0 ? cursor.getString(artistCol) : "Local Device";
                    String album = albumCol >= 0 ? cursor.getString(albumCol) : "Device Storage";
                    String filePath = dataCol >= 0 ? cursor.getString(dataCol) : "";
                    long durationMs = durationCol >= 0 ? cursor.getLong(durationCol) : 0;
                    long id = idCol >= 0 ? cursor.getLong(idCol) : System.currentTimeMillis();

                    if (filePath == null || filePath.isEmpty()) continue;

                    String ext = filePath.contains(".") ? filePath.substring(filePath.lastIndexOf(".") + 1).toUpperCase() : "AUDIO";

                    String cleanPath = filePath.startsWith("/") ? filePath : "/" + filePath;
                    track.put("id", "native-audio-" + id);
                    track.put("title", title != null && !title.isEmpty() ? title : "Device Audio Track");
                    track.put("artist", artist != null && !artist.isEmpty() ? artist : "Device Local Library");
                    track.put("album", album != null ? album : "Storage");
                    track.put("duration", durationMs / 1000);
                    track.put("url", "file://" + cleanPath);
                    track.put("contentUri", "content://media/external/audio/media/" + id);
                    track.put("category", "Local Device Audio");
                    track.put("dateAdded", System.currentTimeMillis());
                    track.put("playCount", 1);
                    track.put("affinityScore", 50);
                    track.put("fileFormat", ext);

                    tracks.put(track);
                } while (cursor.moveToNext());
                cursor.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return tracks.toString();
    }

    private void requestNativeAppPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();

        // 1. Microphone & Camera
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }

        // 2. Geolocation
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        // 3. Storage & Audio Media (Android 13+ and legacy)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
            if (ContextCompat.checkSelfPermission(this, "android.permission.READ_MEDIA_AUDIO") != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add("android.permission.READ_MEDIA_AUDIO");
            }
            if (ContextCompat.checkSelfPermission(this, "android.permission.READ_MEDIA_IMAGES") != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add("android.permission.READ_MEDIA_IMAGES");
            }
            if (ContextCompat.checkSelfPermission(this, "android.permission.READ_MEDIA_VIDEO") != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add("android.permission.READ_MEDIA_VIDEO");
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }
}
