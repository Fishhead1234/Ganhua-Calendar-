package com.ganhuacalendar.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.util.Base64;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Calendar;

@CapacitorPlugin(
    name = "GanhuaWidgetBridge",
    permissions = {
        @Permission(
            alias = "calendar",
            strings = { Manifest.permission.READ_CALENDAR }
        )
    }
)
public class GanhuaWidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            String monthStr = call.getString("monthStr", "");
            String dayStr = call.getString("dayStr", "");
            String lunarStr = call.getString("lunarStr", "");
            String characterStr = call.getString("characterStr", "🐱 厭世社畜貓");
            String quoteStr = call.getString("quoteStr", "");
            String yijiStr = call.getString("yijiStr", "");
            String offworkStr = call.getString("offworkStr", "目標 18:00 下班");
            String streakStr = call.getString("streakStr", "🔥 連續生還 3 天");
            String characterKey = call.getString("characterKey", "cat");
            String avatarBase64 = call.getString("avatarBase64", "");

            SharedPreferences prefs = getContext().getSharedPreferences(
                    GanhuaWidgetProvider.PREFS_NAME,
                    Context.MODE_PRIVATE
            );
            SharedPreferences.Editor editor = prefs.edit();
            if (!monthStr.isEmpty()) editor.putString("month_str", monthStr);
            if (!dayStr.isEmpty()) editor.putString("day_str", dayStr);
            if (!lunarStr.isEmpty()) editor.putString("lunar_str", lunarStr);
            if (!characterStr.isEmpty()) editor.putString("character_str", characterStr);
            if (!quoteStr.isEmpty()) editor.putString("quote_str", quoteStr);
            if (!yijiStr.isEmpty()) editor.putString("yiji_str", yijiStr);
            if (!offworkStr.isEmpty()) editor.putString("offwork_str", offworkStr);
            if (!streakStr.isEmpty()) editor.putString("streak_str", streakStr);
            if (!characterKey.isEmpty()) editor.putString("character_key", characterKey);

            // If an avatar image is supplied, save to internal files dir
            if (avatarBase64 != null && !avatarBase64.isEmpty()) {
                try {
                    String pureBase64 = avatarBase64;
                    int commaIndex = pureBase64.indexOf(",");
                    if (commaIndex != -1) {
                        pureBase64 = pureBase64.substring(commaIndex + 1);
                    }
                    byte[] decoded = Base64.decode(pureBase64, Base64.DEFAULT);
                    File avatarFile = new File(getContext().getFilesDir(), "widget_current_avatar.png");
                    try (FileOutputStream fos = new FileOutputStream(avatarFile)) {
                        fos.write(decoded);
                        fos.flush();
                    }
                    editor.putBoolean("has_custom_avatar", true);
                } catch (Exception imgEx) {
                    imgEx.printStackTrace();
                }
            }

            editor.apply();

            // Refresh all widgets placed on Android Home Screen
            GanhuaWidgetProvider.updateAllWidgets(getContext());

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to update widget: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void requestCalendarPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
        } else {
            requestPermissionForAlias("calendar", call, "calendarPermCallback");
        }
    }

    @PermissionCallback
    private void calendarPermCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
        } else {
            call.reject("Calendar permission denied");
        }
    }

    @PluginMethod
    public void readDeviceCalendarEvents(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("calendar", call, "readEventsCallback");
            return;
        }
        executeReadEvents(call);
    }

    @PermissionCallback
    private void readEventsCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            executeReadEvents(call);
        } else {
            call.reject("Calendar permission denied");
        }
    }

    private void executeReadEvents(PluginCall call) {
        try {
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            long startMs = cal.getTimeInMillis();

            cal.set(Calendar.HOUR_OF_DAY, 23);
            cal.set(Calendar.MINUTE, 59);
            cal.set(Calendar.SECOND, 59);
            cal.set(Calendar.MILLISECOND, 999);
            long endMs = cal.getTimeInMillis();

            Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
            ContentUris.appendId(builder, startMs);
            ContentUris.appendId(builder, endMs);

            String[] projection = new String[]{
                CalendarContract.Instances.EVENT_ID,
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.BEGIN,
                CalendarContract.Instances.END,
                CalendarContract.Instances.ALL_DAY
            };

            ContentResolver resolver = getContext().getContentResolver();
            Cursor cursor = resolver.query(builder.build(), projection, null, null, CalendarContract.Instances.BEGIN + " ASC");

            JSArray eventsArray = new JSArray();
            if (cursor != null) {
                try {
                    int titleIdx = cursor.getColumnIndex(CalendarContract.Instances.TITLE);
                    int beginIdx = cursor.getColumnIndex(CalendarContract.Instances.BEGIN);
                    int endIdx = cursor.getColumnIndex(CalendarContract.Instances.END);
                    int allDayIdx = cursor.getColumnIndex(CalendarContract.Instances.ALL_DAY);

                    while (cursor.moveToNext()) {
                        String title = cursor.getString(titleIdx);
                        if (title == null || title.trim().isEmpty()) {
                            title = "未命名會議";
                        }
                        long begin = cursor.getLong(beginIdx);
                        long end = cursor.getLong(endIdx);
                        boolean isAllDay = cursor.getInt(allDayIdx) != 0;

                        Calendar eventCal = Calendar.getInstance();
                        eventCal.setTimeInMillis(begin);
                        int startHour = eventCal.get(Calendar.HOUR_OF_DAY);
                        int startMinute = eventCal.get(Calendar.MINUTE);
                        int durationMinutes = isAllDay ? 480 : (int) Math.max(15, (end - begin) / (1000 * 60));

                        JSObject ev = new JSObject();
                        ev.put("title", title);
                        ev.put("startHour", startHour);
                        ev.put("startMinute", startMinute);
                        ev.put("durationMinutes", durationMinutes);
                        ev.put("isAllDay", isAllDay);
                        ev.put("beginMs", begin);
                        ev.put("endMs", end);
                        eventsArray.put(ev);
                    }
                } finally {
                    cursor.close();
                }
            }

            JSObject result = new JSObject();
            result.put("events", eventsArray);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to query calendar: " + e.getMessage(), e);
        }
    }
}
