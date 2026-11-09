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
            String fullLunarStr = call.getString("fullLunarStr", "");
            String solarTerm = call.getString("solarTerm", "");
            String characterStr = call.getString("characterStr", "🐱 厭世社畜貓");
            String quoteStr = call.getString("quoteStr", "");
            String yijiStr = call.getString("yijiStr", "");
            String yiStr = call.getString("yiStr", "");
            String jiStr = call.getString("jiStr", "");
            String offworkStr = call.getString("offworkStr", "目標 18:00 下班");
            String streakStr = call.getString("streakStr", "🔥 連續生還 3 天");
            String characterKey = call.getString("characterKey", "cat");
            String avatarBase64 = call.getString("avatarBase64", "");
            int meetingCount = call.getInt("meetingCount", 0);
            String survivedDatesJson = call.getString("survivedDatesJson", "[]");
            String eventsJson = call.getString("eventsJson", "[]");
            String lastTornToDate = call.getString("lastTornToDate", "");
            boolean isTodayUnlocked = Boolean.TRUE.equals(call.getBoolean("isTodayUnlocked", false));

            SharedPreferences prefs = getContext().getSharedPreferences(
                    GanhuaWidgetProvider.PREFS_NAME,
                    Context.MODE_PRIVATE
            );
            SharedPreferences.Editor editor = prefs.edit();
            if (!monthStr.isEmpty()) editor.putString("month_str", monthStr);
            if (!dayStr.isEmpty()) editor.putString("day_str", dayStr);
            if (!lunarStr.isEmpty()) editor.putString("lunar_str", lunarStr);
            if (!fullLunarStr.isEmpty()) editor.putString("full_lunar_str", fullLunarStr);
            if (!solarTerm.isEmpty()) editor.putString("solar_term", solarTerm);
            if (!characterStr.isEmpty()) editor.putString("character_str", characterStr);
            if (!quoteStr.isEmpty()) editor.putString("quote_str", quoteStr);
            if (!yijiStr.isEmpty()) editor.putString("yiji_str", yijiStr);
            if (!yiStr.isEmpty()) editor.putString("yi_str", yiStr);
            if (!jiStr.isEmpty()) editor.putString("ji_str", jiStr);
            if (!offworkStr.isEmpty()) editor.putString("offwork_str", offworkStr);
            if (!streakStr.isEmpty()) editor.putString("streak_str", streakStr);
            if (!characterKey.isEmpty()) editor.putString("character_key", characterKey);
            if (!lastTornToDate.isEmpty()) editor.putString("last_torn_to_date", lastTornToDate);
            editor.putBoolean("is_today_unlocked", isTodayUnlocked);
            editor.putInt("meeting_count", meetingCount);
            if (!survivedDatesJson.isEmpty()) editor.putString("survived_dates_json", survivedDatesJson);
            if (eventsJson != null && !eventsJson.isEmpty()) editor.putString("events_json", eventsJson);

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

            // Refresh all 4 widget types placed on Android Home Screen
            GanhuaWidgetProvider.updateAllWidgets(getContext());
            MonthlySplitWidgetProvider.updateAllWidgets(getContext());
            MonthlyLargeWidgetProvider.updateAllWidgets(getContext());
            DeskCardWidgetProvider.updateAllWidgets(getContext());

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to update widget: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getPendingTornSync(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
                GanhuaWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
        );
        boolean hasPending = prefs.getBoolean("has_pending_torn_sync", false);
        String lastTorn = prefs.getString("last_torn_to_date", "");
        if (hasPending) {
            prefs.edit().putBoolean("has_pending_torn_sync", false).apply();
        }
        JSObject ret = new JSObject();
        ret.put("hasPending", hasPending);
        ret.put("lastTornToDate", lastTorn);
        call.resolve(ret);
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
    public void getPendingWidgetDate(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
                GanhuaWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
        );
        String pending = prefs.getString("pending_widget_select_date", null);
        if (pending != null) {
            prefs.edit().remove("pending_widget_select_date").apply();
        }
        JSObject ret = new JSObject();
        ret.put("date", pending != null ? pending : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void getPendingSurvivedSync(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
                GanhuaWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
        );
        boolean hasPending = prefs.getBoolean("has_pending_survived_sync", false);
        String survivedJson = prefs.getString("survived_dates_json", "[]");
        int streakCount = prefs.getInt("streak_count", 3);
        if (hasPending) {
            prefs.edit().putBoolean("has_pending_survived_sync", false).apply();
        }
        JSObject ret = new JSObject();
        ret.put("hasPending", hasPending);
        ret.put("survivedDatesJson", survivedJson);
        ret.put("streakCount", streakCount);
        call.resolve(ret);
    }

    @PluginMethod
    public void listCalendars(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("calendar", call, "listCalendarsCallback");
            return;
        }
        executeListCalendars(call);
    }

    @PermissionCallback
    private void listCalendarsCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            executeListCalendars(call);
        } else {
            call.reject("Calendar permission denied");
        }
    }

    private void executeListCalendars(PluginCall call) {
        try {
            String[] projection = new String[]{
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                CalendarContract.Calendars.ACCOUNT_NAME,
                CalendarContract.Calendars.CALENDAR_COLOR,
                CalendarContract.Calendars.IS_PRIMARY
            };

            ContentResolver resolver = getContext().getContentResolver();
            Cursor cursor = resolver.query(CalendarContract.Calendars.CONTENT_URI, projection, null, null, CalendarContract.Calendars.CALENDAR_DISPLAY_NAME + " ASC");

            JSArray calendarsArray = new JSArray();
            if (cursor != null) {
                try {
                    int idIdx = cursor.getColumnIndex(CalendarContract.Calendars._ID);
                    int nameIdx = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME);
                    int accIdx = cursor.getColumnIndex(CalendarContract.Calendars.ACCOUNT_NAME);
                    int colorIdx = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_COLOR);
                    int primaryIdx = cursor.getColumnIndex(CalendarContract.Calendars.IS_PRIMARY);

                    while (cursor.moveToNext()) {
                        String id = String.valueOf(cursor.getLong(idIdx));
                        String name = cursor.getString(nameIdx);
                        if (name == null || name.trim().isEmpty()) {
                            name = "未命名日曆";
                        }
                        String accountName = accIdx != -1 ? cursor.getString(accIdx) : "";
                        boolean isPrimary = primaryIdx != -1 && cursor.getInt(primaryIdx) != 0;

                        String colorHex = "#2D2D2D";
                        if (colorIdx != -1 && !cursor.isNull(colorIdx)) {
                            int colorInt = cursor.getInt(colorIdx);
                            colorHex = String.format("#%06X", (0xFFFFFF & colorInt));
                        }

                        JSObject calObj = new JSObject();
                        calObj.put("id", id);
                        calObj.put("name", name);
                        calObj.put("title", name);
                        calObj.put("accountName", accountName != null ? accountName : "");
                        calObj.put("color", colorHex);
                        calObj.put("isPrimary", isPrimary);

                        calendarsArray.put(calObj);
                    }
                } finally {
                    cursor.close();
                }
            }

            JSObject res = new JSObject();
            res.put("calendars", calendarsArray);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to list calendars: " + e.getMessage(), e);
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
            Long customStart = call.getLong("startDate");
            Long customEnd = call.getLong("endDate");
            long startMs;
            long endMs;

            if (customStart != null && customEnd != null) {
                startMs = customStart;
                endMs = customEnd;
            } else {
                // Default range: 30 days in the past to 60 days in the future
                // Covers the full month so MonthlyCalendarModal has dots & details for all days!
                Calendar cal = Calendar.getInstance();
                cal.add(Calendar.DAY_OF_YEAR, -30);
                cal.set(Calendar.HOUR_OF_DAY, 0);
                cal.set(Calendar.MINUTE, 0);
                cal.set(Calendar.SECOND, 0);
                cal.set(Calendar.MILLISECOND, 0);
                startMs = cal.getTimeInMillis();

                Calendar endCal = Calendar.getInstance();
                endCal.add(Calendar.DAY_OF_YEAR, 60);
                endCal.set(Calendar.HOUR_OF_DAY, 23);
                endCal.set(Calendar.MINUTE, 59);
                endCal.set(Calendar.SECOND, 59);
                endCal.set(Calendar.MILLISECOND, 999);
                endMs = endCal.getTimeInMillis();
            }

            Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
            ContentUris.appendId(builder, startMs);
            ContentUris.appendId(builder, endMs);

            String[] projection = new String[]{
                CalendarContract.Instances.EVENT_ID,
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.BEGIN,
                CalendarContract.Instances.END,
                CalendarContract.Instances.ALL_DAY,
                CalendarContract.Instances.CALENDAR_ID,
                CalendarContract.Instances.CALENDAR_DISPLAY_NAME,
                CalendarContract.Instances.CALENDAR_COLOR
            };

            ContentResolver resolver = getContext().getContentResolver();
            Cursor cursor = resolver.query(builder.build(), projection, null, null, CalendarContract.Instances.BEGIN + " ASC");

            JSArray eventsArray = new JSArray();
            if (cursor != null) {
                try {
                    int eventIdIdx = cursor.getColumnIndex(CalendarContract.Instances.EVENT_ID);
                    int titleIdx = cursor.getColumnIndex(CalendarContract.Instances.TITLE);
                    int beginIdx = cursor.getColumnIndex(CalendarContract.Instances.BEGIN);
                    int endIdx = cursor.getColumnIndex(CalendarContract.Instances.END);
                    int allDayIdx = cursor.getColumnIndex(CalendarContract.Instances.ALL_DAY);
                    int calIdColIdx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_ID);
                    int calNameIdx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_DISPLAY_NAME);
                    int calColorIdx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_COLOR);

                    while (cursor.moveToNext()) {
                        String title = cursor.getString(titleIdx);
                        if (title == null || title.trim().isEmpty()) {
                            title = "未命名會議";
                        }
                        String eventId = eventIdIdx != -1 ? String.valueOf(cursor.getLong(eventIdIdx)) : ("device-" + cursor.getPosition());
                        long begin = cursor.getLong(beginIdx);
                        long end = cursor.getLong(endIdx);
                        boolean isAllDay = cursor.getInt(allDayIdx) != 0;

                        Calendar eventCal;
                        int startHour;
                        int startMinute;

                        if (isAllDay) {
                            // In Android CalendarContract, all-day events have BEGIN stored at UTC midnight.
                            // Parsing with UTC Calendar prevents off-by-one day shifting in UTC+8 / other timezones!
                            eventCal = Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"));
                            eventCal.setTimeInMillis(begin);
                            startHour = 9;
                            startMinute = 0;
                        } else {
                            eventCal = Calendar.getInstance();
                            eventCal.setTimeInMillis(begin);
                            startHour = eventCal.get(Calendar.HOUR_OF_DAY);
                            startMinute = eventCal.get(Calendar.MINUTE);
                        }

                        int year = eventCal.get(Calendar.YEAR);
                        int month = eventCal.get(Calendar.MONTH) + 1;
                        int day = eventCal.get(Calendar.DAY_OF_MONTH);
                        String dateKey = String.format("%04d-%02d-%02d", year, month, day);

                        int durationMinutes = isAllDay ? 480 : (int) Math.max(15, (end - begin) / (1000 * 60));

                        JSObject ev = new JSObject();
                        ev.put("id", eventId);
                        ev.put("title", title);
                        ev.put("startHour", startHour);
                        ev.put("startMinute", startMinute);
                        ev.put("durationMinutes", durationMinutes);
                        ev.put("isAllDay", isAllDay);
                        ev.put("dateKey", dateKey);
                        ev.put("beginMs", begin);
                        ev.put("endMs", end);

                        if (calIdColIdx != -1 && !cursor.isNull(calIdColIdx)) {
                            ev.put("calendarId", String.valueOf(cursor.getLong(calIdColIdx)));
                        }

                        if (calNameIdx != -1 && !cursor.isNull(calNameIdx)) {
                            String calName = cursor.getString(calNameIdx);
                            if (calName != null && !calName.isEmpty()) {
                                ev.put("calendarName", calName);
                            }
                        }
                        if (calColorIdx != -1 && !cursor.isNull(calColorIdx)) {
                            int colorInt = cursor.getInt(calColorIdx);
                            String colorHex = String.format("#%06X", (0xFFFFFF & colorInt));
                            ev.put("calendarColor", colorHex);
                        }

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
