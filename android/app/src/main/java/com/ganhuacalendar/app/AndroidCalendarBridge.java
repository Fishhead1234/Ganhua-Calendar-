package com.ganhuacalendar.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.CalendarContract;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class AndroidCalendarBridge {
    private final Context context;

    public AndroidCalendarBridge(Context context) {
        this.context = context;
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return true;
    }

    /**
     * 1. Query all calendars on phone with NO filters and NO deduplication by name.
     * Returns all sub-calendars, including Google Calendar, Outlook, Family, Work, etc.
     */
    @JavascriptInterface
    public String getCalendarsJson() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            return "[]";
        }

        JSONArray array = new JSONArray();
        ContentResolver resolver = context.getContentResolver();

        String[] projection = new String[]{
            CalendarContract.Calendars._ID,
            CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
            CalendarContract.Calendars.ACCOUNT_NAME,
            CalendarContract.Calendars.CALENDAR_COLOR,
            CalendarContract.Calendars.IS_PRIMARY,
            CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL
        };

        try (Cursor cursor = resolver.query(
                CalendarContract.Calendars.CONTENT_URI,
                projection,
                null,
                null,
                CalendarContract.Calendars.CALENDAR_DISPLAY_NAME + " ASC")) {

            if (cursor != null) {
                int idIdx = cursor.getColumnIndex(CalendarContract.Calendars._ID);
                int nameIdx = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME);
                int accIdx = cursor.getColumnIndex(CalendarContract.Calendars.ACCOUNT_NAME);
                int colorIdx = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_COLOR);
                int primaryIdx = cursor.getColumnIndex(CalendarContract.Calendars.IS_PRIMARY);
                int accessIdx = cursor.getColumnIndex(CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL);

                while (cursor.moveToNext()) {
                    String id = String.valueOf(cursor.getLong(idIdx));
                    String name = cursor.getString(nameIdx);
                    if (name == null || name.trim().isEmpty()) {
                        name = "未命名日曆";
                    }
                    String accountName = accIdx != -1 ? cursor.getString(accIdx) : "";
                    boolean isPrimary = primaryIdx != -1 && cursor.getInt(primaryIdx) != 0;
                    int accessLevel = (accessIdx != -1 && !cursor.isNull(accessIdx)) ? cursor.getInt(accessIdx) : 0;

                    String colorHex = "#2D2D2D";
                    if (colorIdx != -1 && !cursor.isNull(colorIdx)) {
                        int colorInt = cursor.getInt(colorIdx);
                        colorHex = String.format("#%06X", (0xFFFFFF & colorInt));
                    }

                    JSONObject obj = new JSONObject();
                    obj.put("id", id);
                    obj.put("name", name);
                    obj.put("title", name);
                    obj.put("accountName", accountName != null ? accountName : "");
                    obj.put("color", colorHex);
                    obj.put("isPrimary", isPrimary);
                    obj.put("accessLevel", accessLevel);
                    obj.put("isReadOnly", accessLevel < CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR);

                    array.put(obj);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return array.toString();
    }

    /**
     * 2. Query CalendarContract.Instances across [startMs, endMs].
     * Expands recurring events (RRULE) and subscribed calendars (Google, Outlook, Family, Work).
     * For all-day events (ALL_DAY == 1), extracts YYYY-MM-DD using UTC timezone.
     */
    @JavascriptInterface
    public String getEventsInstancesJson(long startMs, long endMs) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            return "[]";
        }

        JSONArray array = new JSONArray();
        ContentResolver resolver = context.getContentResolver();

        Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
        ContentUris.appendId(builder, startMs);
        ContentUris.appendId(builder, endMs);
        Uri uri = builder.build();

        String[] projection = new String[]{
            CalendarContract.Instances.EVENT_ID,
            CalendarContract.Instances.CALENDAR_ID,
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.ALL_DAY,
            CalendarContract.Instances.CALENDAR_DISPLAY_NAME,
            CalendarContract.Instances.CALENDAR_COLOR,
            CalendarContract.Instances.CALENDAR_ACCESS_LEVEL,
            CalendarContract.Instances.EVENT_LOCATION,
            CalendarContract.Instances.DESCRIPTION
        };

        // All-day timestamps in Android are stored at 00:00:00 UTC. Use UTC to extract correct YYYY-MM-DD!
        SimpleDateFormat utcDateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        utcDateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

        SimpleDateFormat localDateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());

        try (Cursor cursor = resolver.query(uri, projection, null, null, CalendarContract.Instances.BEGIN + " ASC")) {
            if (cursor != null) {
                int eventIdIdx = cursor.getColumnIndex(CalendarContract.Instances.EVENT_ID);
                int calIdIdx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_ID);
                int titleIdx = cursor.getColumnIndex(CalendarContract.Instances.TITLE);
                int beginIdx = cursor.getColumnIndex(CalendarContract.Instances.BEGIN);
                int endIdx = cursor.getColumnIndex(CalendarContract.Instances.END);
                int allDayIdx = cursor.getColumnIndex(CalendarContract.Instances.ALL_DAY);
                int calNameIdx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_DISPLAY_NAME);
                int calColorIdx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_COLOR);
                int accessIdx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_ACCESS_LEVEL);
                int descIdx = cursor.getColumnIndex(CalendarContract.Instances.DESCRIPTION);
                int locIdx = cursor.getColumnIndex(CalendarContract.Instances.EVENT_LOCATION);

                Calendar localCal = Calendar.getInstance();

                while (cursor.moveToNext()) {
                    long eventId = cursor.getLong(eventIdIdx);
                    long calId = cursor.getLong(calIdIdx);
                    String title = cursor.getString(titleIdx);
                    if (title == null || title.trim().isEmpty()) {
                        title = "未命名行程";
                    }
                    long begin = cursor.getLong(beginIdx);
                    long end = cursor.getLong(endIdx);
                    boolean isAllDay = allDayIdx != -1 && cursor.getInt(allDayIdx) != 0;

                    String calName = calNameIdx != -1 ? cursor.getString(calNameIdx) : "";
                    int accessLevel = (accessIdx != -1 && !cursor.isNull(accessIdx)) ? cursor.getInt(accessIdx) : 0;
                    boolean isReadOnly = accessLevel < CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR;
                    String colorHex = "#2D2D2D";
                    if (calColorIdx != -1 && !cursor.isNull(calColorIdx)) {
                        colorHex = String.format("#%06X", (0xFFFFFF & cursor.getInt(calColorIdx)));
                    }

                    String dateKey;
                    int startHour;
                    int startMinute;
                    int durationMinutes;
                    boolean isFridayAfterFour;

                    if (isAllDay) {
                        dateKey = utcDateFormat.format(new Date(begin));
                        startHour = 9;
                        startMinute = 0;
                        durationMinutes = 480;
                        isFridayAfterFour = false;
                    } else {
                        localCal.setTimeInMillis(begin);
                        dateKey = localDateFormat.format(new Date(begin));
                        startHour = localCal.get(Calendar.HOUR_OF_DAY);
                        startMinute = localCal.get(Calendar.MINUTE);
                        durationMinutes = (int) Math.max(15, (end - begin) / (1000 * 60));
                        isFridayAfterFour = (localCal.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY) &&
                                            (startHour >= 16 || (startHour == 15 && startMinute >= 45));
                    }

                    JSONObject obj = new JSONObject();
                    obj.put("id", "inst_" + eventId + "_" + begin);
                    obj.put("eventId", eventId);
                    obj.put("calendarId", String.valueOf(calId));
                    obj.put("accessLevel", accessLevel);
                    obj.put("isReadOnly", isReadOnly);
                    obj.put("title", title);
                    obj.put("startHour", startHour);
                    obj.put("startMinute", startMinute);
                    obj.put("durationMinutes", durationMinutes);
                    obj.put("dateKey", dateKey);
                    obj.put("isAllDay", isAllDay);
                    obj.put("isFridayAfterFour", isFridayAfterFour);
                    obj.put("source", "synced");
                    obj.put("calendarName", calName);
                    obj.put("calendarColor", colorHex);
                    if (descIdx != -1) {
                        obj.put("notes", cursor.getString(descIdx));
                    }
                    if (locIdx != -1) {
                        obj.put("location", cursor.getString(locIdx));
                    }

                    array.put(obj);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return array.toString();
    }

    /**
     * 3. Native CORS-free iCal fetcher using HttpURLConnection.
     * Follows redirects (301, 302, 307, 308) and returns .ics raw string.
     */
    @JavascriptInterface
    public String fetchIcsUrl(String urlStr) {
        if (urlStr == null || urlStr.trim().isEmpty()) {
            return "";
        }

        String targetUrl = urlStr.trim().replaceAll("^(?i)webcal://", "https://");
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        HttpURLConnection conn = null;
        try {
            int redirects = 0;
            while (redirects < 5) {
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(18000);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36");
                conn.setRequestProperty("Accept", "text/calendar, application/json, text/plain, */*");

                int status = conn.getResponseCode();
                if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
                    status == HttpURLConnection.HTTP_MOVED_PERM ||
                    status == HttpURLConnection.HTTP_SEE_OTHER ||
                    status == 307 || status == 308) {
                    String newUrl = conn.getHeaderField("Location");
                    if (newUrl != null && !newUrl.isEmpty()) {
                        targetUrl = newUrl;
                        redirects++;
                        conn.disconnect();
                        continue;
                    }
                }

                if (status >= 200 && status < 300) {
                    InputStream in = conn.getInputStream();
                    BufferedReader reader = new BufferedReader(new InputStreamReader(in, "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                    reader.close();
                    return sb.toString();
                } else {
                    return "ERROR: HTTP " + status;
                }
            }
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
        return "ERROR: Too many redirects";
    }

    /**
     * Compute reminder trigger timestamp in milliseconds.
     * Supports relative ('minutes', 'hours', 'days') and absolute ('exact' with exactDate & exactTime).
     */
    private long computeTriggerTimeMs(JSONObject rem, long eventStartMs, String defaultDateKey) {
        String unit = rem.optString("unit", "minutes");
        if ("exact".equals(unit)) {
            String exactDate = rem.optString("exactDate", defaultDateKey);
            String exactTime = rem.optString("exactTime", "");
            if (exactTime == null || !exactTime.contains(":")) return -1L;
            String[] dParts = (exactDate != null && !exactDate.isEmpty() ? exactDate : defaultDateKey).split("-");
            String[] tParts = exactTime.split(":");
            if (dParts.length < 3 || tParts.length < 2) return -1L;
            try {
                Calendar cal = Calendar.getInstance();
                cal.set(
                    Integer.parseInt(dParts[0]),
                    Integer.parseInt(dParts[1]) - 1,
                    Integer.parseInt(dParts[2]),
                    Integer.parseInt(tParts[0]),
                    Integer.parseInt(tParts[1]),
                    0
                );
                cal.set(Calendar.MILLISECOND, 0);
                return cal.getTimeInMillis();
            } catch (Exception ignored) {
                return -1L;
            }
        }
        int val = rem.optInt("value", 10);
        long offsetMs;
        if ("minutes".equals(unit)) {
            offsetMs = (long) val * 60 * 1000L;
        } else if ("days".equals(unit)) {
            offsetMs = (long) val * 86400 * 1000L;
        } else {
            offsetMs = (long) val * 3600 * 1000L;
        }
        return eventStartMs - offsetMs;
    }

    private String formatReminderUnitText(JSONObject rem) {
        String unit = rem.optString("unit", "minutes");
        if ("exact".equals(unit)) {
            String exactTime = rem.optString("exactTime", "");
            return "指定提醒 " + exactTime;
        }
        int val = rem.optInt("value", 10);
        if ("minutes".equals(unit)) {
            return val == 0 ? "行程開始提醒" : (val + " 分鐘後開始");
        } else if ("days".equals(unit)) {
            return val + " 天後開始";
        } else {
            return val + " 小時後開始";
        }
    }

    private int scheduleRemindersForEvent(
            AlarmManager am,
            android.content.SharedPreferences prefs,
            JSONObject obj,
            long now,
            boolean forceCancelFirst
    ) throws Exception {
        String id = obj.optString("id");
        String title = obj.optString("title", "社畜行程");
        String dateKey = obj.optString("dateKey");
        int startHour = obj.optInt("startHour", 9);
        int startMinute = obj.optInt("startMinute", 0);
        boolean isAllDay = obj.optBoolean("isAllDay", false);
        boolean notificationsDisabled = obj.optBoolean("notificationsDisabled", false);

        if (id == null || id.isEmpty() || dateKey == null || dateKey.isEmpty()) {
            return 0;
        }

        if (forceCancelFirst || notificationsDisabled) {
            cancelEventNotifications(id);
        }

        if (notificationsDisabled) {
            return 0;
        }

        // If client explicitly sent empty reminders list, respect it as no notifications
        if (obj.has("reminders") && !obj.isNull("reminders")) {
            JSONArray explicitRem = obj.optJSONArray("reminders");
            if (explicitRem != null && explicitRem.length() == 0) {
                cancelEventNotifications(id);
                return 0;
            }
        }

        String roast = obj.optString("roast");
        if (roast == null || roast.isEmpty()) {
            roast = generateFunnyMeetingRoast(title, startHour);
        }

        String[] parts = dateKey.split("-");
        if (parts.length < 3) return 0;

        int year = Integer.parseInt(parts[0]);
        int month = Integer.parseInt(parts[1]) - 1;
        int day = Integer.parseInt(parts[2]);

        Calendar eventTime = Calendar.getInstance();
        eventTime.set(year, month, day, isAllDay ? 9 : startHour, isAllDay ? 0 : startMinute, 0);
        eventTime.set(Calendar.MILLISECOND, 0);
        long eventStartMs = eventTime.getTimeInMillis();

        // Allow reminder scheduling as long as reminders themselves might be future or event hasn't ended
        long durationMs = (long) obj.optInt("durationMinutes", 60) * 60 * 1000L;
        if (eventStartMs + durationMs < now) {
            return 0;
        }

        if (eventStartMs - now > 14L * 86400 * 1000L) {
            return 0;
        }

        JSONArray reminders = obj.optJSONArray("reminders");
        if (reminders == null) {
            reminders = new JSONArray();
            JSONObject defRem = new JSONObject();
            defRem.put("value", isAllDay ? 0 : 10);
            defRem.put("unit", "minutes");
            reminders.put(defRem);
        }

        StringBuilder trackedCodes = new StringBuilder();
        int scheduledCount = 0;
        int maxRem = Math.min(reminders.length(), 3);
        String timeStr = String.format(Locale.getDefault(), "%02d:%02d", isAllDay ? 9 : startHour, isAllDay ? 0 : startMinute);

        for (int i = 0; i < maxRem; i++) {
            JSONObject rem = reminders.getJSONObject(i);
            long triggerMs = computeTriggerTimeMs(rem, eventStartMs, dateKey);
            if (triggerMs <= now + 5000L) {
                continue;
            }

            long triggerMinute = triggerMs / 60000L;
            String notifKey = dateKey + "_" + title + "_" + timeStr + "_" + i + "_" + triggerMinute;
            if (prefs.getBoolean("fired_" + notifKey, false)) {
                continue;
            }

            String unitText = formatReminderUnitText(rem);
            Intent intent = new Intent(context, EventReminderReceiver.class);
            intent.setAction(EventReminderReceiver.ACTION_EVENT_REMINDER);
            intent.putExtra("eventId", id);
            intent.putExtra("reminderIndex", i);
            intent.putExtra("triggerMinute", triggerMinute);
            intent.putExtra("title", title);
            intent.putExtra("dateKey", dateKey);
            intent.putExtra("timeStr", timeStr);
            intent.putExtra("reminderText", unitText);
            intent.putExtra("roast", roast);

            int requestCode = Math.abs(notifKey.hashCode());
            int pendingFlag = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlag |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, pendingFlag);

            safeScheduleAlarm(am, triggerMs, pi);
            if (trackedCodes.length() > 0) trackedCodes.append(",");
            trackedCodes.append(requestCode);
            scheduledCount++;
        }

        if (trackedCodes.length() > 0) {
            prefs.edit().putString("reqCodes_" + id, trackedCodes.toString()).apply();
        }
        return scheduledCount;
    }

    /**
     * Schedule up to 3 custom reminder notifications for an event via AlarmManager
     */
    @JavascriptInterface
    public String scheduleEventNotifications(String eventJson) {
        try {
            JSONObject obj = new JSONObject(eventJson);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return "{\"error\": \"AlarmManager unavailable\"}";
            android.content.SharedPreferences prefs = context.getSharedPreferences("ganhua_reminders", Context.MODE_PRIVATE);
            int scheduledCount = scheduleRemindersForEvent(am, prefs, obj, System.currentTimeMillis(), true);
            return "{\"scheduled\": " + scheduledCount + ", \"success\": true}";
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    /**
     * Check if exact alarms can be scheduled on Android 12+ (API 31+)
     */
    @JavascriptInterface
    public boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            return am != null && am.canScheduleExactAlarms();
        }
        return true;
    }

    /**
     * Open system settings for user to grant exact alarm permission
     */
    @JavascriptInterface
    public boolean openExactAlarmSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return true;
            } catch (Exception e) {
                return false;
            }
        }
        return true;
    }

    /**
     * Send an immediate test notification (in delaySeconds, e.g. 3s)
     */
    @JavascriptInterface
    public boolean sendTestNotification(int delaySeconds) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return false;

            int delay = delaySeconds > 0 ? delaySeconds : 3;
            long triggerMs = System.currentTimeMillis() + (long) delay * 1000L;

            Intent intent = new Intent(context, EventReminderReceiver.class);
            intent.setAction(EventReminderReceiver.ACTION_EVENT_REMINDER);
            intent.putExtra("eventId", "test_notification");
            intent.putExtra("reminderIndex", 0);
            intent.putExtra("title", "測試會議：即刻下班戰術研討會");
            intent.putExtra("dateKey", new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date()));
            intent.putExtra("timeStr", "10分鐘後開始");
            intent.putExtra("reminderText", "測試提醒");
            intent.putExtra("roast", "🔥 幹話生存指引：深呼吸，肉體出席點頭就好，靈魂請準時請假！");

            int requestCode = "test_notification".hashCode();
            int pendingFlag = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlag |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, pendingFlag);

            safeScheduleAlarm(am, triggerMs, pi);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Generate funny sarcastic defense quote based on meeting title and start time
     */
    private String generateFunnyMeetingRoast(String title, int startHour) {
        if (title == null) title = "";
        String lower = title.toLowerCase(Locale.ROOT);
        if (startHour >= 16) {
            return "下班前最後掙扎，深呼吸，堅持住，馬上就能逃離現場。";
        }
        if (startHour <= 9) {
            return "求生意志開箱中！靈魂請假，肉體出席點頭就好。";
        }
        if (lower.contains("1-on-1") || lower.contains("review") || title.contains("面談") || title.contains("考核")) {
            return "微笑點頭模式啟動！左耳進右耳出是最高防禦境界。";
        }
        if (title.contains("週會") || title.contains("例會") || title.contains("早會") || title.contains("夕會")) {
            return "集體放空修仙中，假裝在思考，其實在想午餐吃什麼。";
        }
        if (title.contains("客戶") || title.contains("提案") || lower.contains("pitch") || title.contains("外部")) {
            return "心平氣和阿彌陀佛，顧客永遠是對的，除非他給得不夠多。";
        }
        if (lower.contains("all hands") || title.contains("全員") || title.contains("大會")) {
            return "全員通靈大會，眼神堅定看著投影幕，精神已經下班回家。";
        }
        return "深呼吸，肉體出席點頭就好，靈魂請準時請假。";
    }

    /**
     * Safely schedule an alarm on AlarmManager without throwing SecurityException on Android 12+
     */
    private void safeScheduleAlarm(AlarmManager am, long triggerMs, PendingIntent pi) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerMs, pi);
            }
        } catch (SecurityException se) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerMs, pi);
                }
            } catch (Exception ignored) {
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Cancel and remove all posted reminder notifications from notification tray
     */
    @JavascriptInterface
    public boolean cancelAllEventNotifications() {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancelAll();
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Sync and schedule reminders for ALL upcoming calendar events (both phone synced & custom)
     */
    @JavascriptInterface
    public String syncAllEventReminders(String eventsJsonArray) {
        if (eventsJsonArray == null || eventsJsonArray.trim().isEmpty() || eventsJsonArray.trim().equals("[]")) {
            cancelAllEventNotifications();
            return "{\"scheduled\": 0, \"message\": \"Cleared all reminders\"}";
        }

        try {
            JSONArray events = new JSONArray(eventsJsonArray);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return "{\"error\": \"AlarmManager unavailable\"}";

            long now = System.currentTimeMillis();
            int totalScheduled = 0;
            android.content.SharedPreferences prefs = context.getSharedPreferences("ganhua_reminders", Context.MODE_PRIVATE);

            for (int e = 0; e < events.length(); e++) {
                JSONObject obj = events.getJSONObject(e);
                totalScheduled += scheduleRemindersForEvent(am, prefs, obj, now, false);
            }

            return "{\"success\": true, \"scheduledCount\": " + totalScheduled + "}";
        } catch (Exception e) {
            e.printStackTrace();
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    /**
     * Cancel all active reminder notifications and tray banners for an event
     */
    @JavascriptInterface
    public String cancelEventNotifications(String eventId) {
        if (eventId == null || eventId.isEmpty()) {
            return "{\"cancelled\": false}";
        }
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            android.content.SharedPreferences prefs = context.getSharedPreferences("ganhua_reminders", Context.MODE_PRIVATE);

            String savedCodes = prefs.getString("reqCodes_" + eventId, "");
            if (savedCodes != null && !savedCodes.isEmpty()) {
                for (String codeStr : savedCodes.split(",")) {
                    try {
                        int requestCode = Integer.parseInt(codeStr.trim());
                        if (am != null) {
                            Intent intent = new Intent(context, EventReminderReceiver.class);
                            intent.setAction(EventReminderReceiver.ACTION_EVENT_REMINDER);
                            int pendingFlag = PendingIntent.FLAG_NO_CREATE;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                pendingFlag |= PendingIntent.FLAG_IMMUTABLE;
                            }
                            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, pendingFlag);
                            if (pi != null) {
                                am.cancel(pi);
                                pi.cancel();
                            }
                        }
                        if (nm != null) {
                            nm.cancel(requestCode);
                        }
                    } catch (NumberFormatException ignored) {}
                }
                prefs.edit().remove("reqCodes_" + eventId).apply();
            }

            if (am != null) {
                for (int i = 0; i < 3; i++) {
                    int requestCode = (eventId + "_" + i).hashCode();
                    Intent intent = new Intent(context, EventReminderReceiver.class);
                    intent.setAction(EventReminderReceiver.ACTION_EVENT_REMINDER);
                    int pendingFlag = PendingIntent.FLAG_NO_CREATE;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        pendingFlag |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, pendingFlag);
                    if (pi != null) {
                        am.cancel(pi);
                        pi.cancel();
                    }
                }
            }
            return "{\"cancelled\": true}";
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    /**
     * Share high-resolution 9:16 story/post directly to Instagram
     */
    @JavascriptInterface
    public boolean shareToInstagram(String base64Data, String caption) {
        try {
            if (base64Data == null || base64Data.isEmpty()) {
                return false;
            }
            String cleanB64 = base64Data;
            if (cleanB64.contains(",")) {
                cleanB64 = cleanB64.substring(cleanB64.indexOf(",") + 1);
            }
            byte[] decoded = Base64.decode(cleanB64, Base64.DEFAULT);

            // Write image to internal cache directory (configured in file_paths.xml)
            File cacheDir = context.getCacheDir();
            File shareFile = new File(cacheDir, "ganhua_share_story.png");
            FileOutputStream fos = new FileOutputStream(shareFile);
            fos.write(decoded);
            fos.flush();
            fos.close();

            // Obtain FileProvider URI
            Uri contentUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                shareFile
            );

            // Grant read permission explicitly to Instagram
            try {
                context.grantUriPermission("com.instagram.android", contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {}

            // 1. Direct Instagram Story Intent
            try {
                Intent storyIntent = new Intent("com.instagram.share.ADD_TO_STORY");
                storyIntent.setDataAndType(contentUri, "image/png");
                storyIntent.putExtra("source_application", context.getPackageName());
                storyIntent.setPackage("com.instagram.android");
                storyIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(storyIntent);
                return true;
            } catch (Exception e1) {
                // If story intent fails, continue to feed/direct intent
            }

            // 2. Direct Instagram Post / Share (ACTION_SEND targeting com.instagram.android)
            try {
                Intent igSendIntent = new Intent(Intent.ACTION_SEND);
                igSendIntent.setType("image/png");
                igSendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                if (caption != null && !caption.isEmpty()) {
                    igSendIntent.putExtra(Intent.EXTRA_TEXT, caption);
                }
                igSendIntent.setPackage("com.instagram.android");
                igSendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(igSendIntent);
                return true;
            } catch (Exception e2) {
                // If package intent fails, continue
            }

            // 3. Fallback: Instagram Deep-link URI scheme
            try {
                Intent igUriIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("instagram://story-camera"));
                igUriIntent.setPackage("com.instagram.android");
                igUriIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(igUriIntent);
                return true;
            } catch (Exception e3) {
                // If scheme fails, continue to chooser
            }

            // 4. Fallback: Native system share chooser
            try {
                Intent chooserIntent = new Intent(Intent.ACTION_SEND);
                chooserIntent.setType("image/png");
                chooserIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                if (caption != null && !caption.isEmpty()) {
                    chooserIntent.putExtra(Intent.EXTRA_TEXT, caption);
                }
                chooserIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(chooserIntent, "分享至 Instagram");
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(chooser);
                return true;
            } catch (Exception e4) {
                return false;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Check whether WRITE_CALENDAR permission is currently granted.
     */
    @JavascriptInterface
    public boolean hasWriteCalendarPermission() {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Request WRITE_CALENDAR permission at runtime if not yet granted.
     */
    @JavascriptInterface
    public void requestWriteCalendarPermission() {
        if (context instanceof Activity) {
            Activity activity = (Activity) context;
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    activity,
                    new String[]{ Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR },
                    103
                );
            }
        }
    }

    /**
     * Delete an event from Android's system CalendarContract.Events database.
     * Deletion automatically syncs back to Google Calendar.
     */
    @JavascriptInterface
    public boolean deleteCalendarEvent(long eventId) {
        if (eventId <= 0) {
            return false;
        }
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        try {
            Uri deleteUri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId);
            int rows = context.getContentResolver().delete(deleteUri, null, null);
            return rows > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Create an event directly in a specific Android / Google Calendar.
     * Inserts reminders (up to 3) into CalendarContract.Reminders.CONTENT_URI.
     * Returns the newly created CalendarContract.Events._ID, or -1 on failure.
     */
    @JavascriptInterface
    public long createCalendarEvent(
            String calendarId,
            String title,
            long startMs,
            long endMs,
            boolean isAllDay,
            String notes,
            String remindersJson
    ) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            requestWriteCalendarPermission();
            return -1L;
        }

        if (calendarId == null || calendarId.trim().isEmpty()) {
            return -1L;
        }

        try {
            long calId = Long.parseLong(calendarId.trim());
            ContentResolver resolver = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(CalendarContract.Events.CALENDAR_ID, calId);
            values.put(CalendarContract.Events.TITLE, (title != null && !title.trim().isEmpty()) ? title.trim() : "未命名行程");
            values.put(CalendarContract.Events.DESCRIPTION, notes != null ? notes : "");

            long effectiveStartMs = startMs;
            if (isAllDay) {
                Calendar localCal = Calendar.getInstance();
                localCal.setTimeInMillis(startMs);
                Calendar utcStart = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
                utcStart.clear();
                utcStart.set(
                    localCal.get(Calendar.YEAR),
                    localCal.get(Calendar.MONTH),
                    localCal.get(Calendar.DAY_OF_MONTH),
                    0, 0, 0
                );
                long utcStartMs = utcStart.getTimeInMillis();
                long dayCount = Math.max(1L, Math.round((double) Math.max(86400000L, endMs - startMs) / 86400000.0));
                long utcEndMs = utcStartMs + dayCount * 86400000L;

                values.put(CalendarContract.Events.ALL_DAY, 1);
                values.put(CalendarContract.Events.EVENT_TIMEZONE, "UTC");
                values.put(CalendarContract.Events.DTSTART, utcStartMs);
                values.put(CalendarContract.Events.DTEND, utcEndMs);
                effectiveStartMs = utcStartMs;
            } else {
                long safeEndMs = Math.max(endMs, startMs + 15L * 60L * 1000L);
                values.put(CalendarContract.Events.ALL_DAY, 0);
                values.put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());
                values.put(CalendarContract.Events.DTSTART, startMs);
                values.put(CalendarContract.Events.DTEND, safeEndMs);
            }

            Uri insertedUri = resolver.insert(CalendarContract.Events.CONTENT_URI, values);
            if (insertedUri == null) {
                return -1L;
            }

            long eventId = ContentUris.parseId(insertedUri);
            if (eventId <= 0) {
                return -1L;
            }

            // Insert up to 3 reminders into CalendarContract.Reminders.CONTENT_URI
            if (remindersJson != null && !remindersJson.trim().isEmpty()) {
                try {
                    JSONArray reminders = new JSONArray(remindersJson);
                    int count = Math.min(3, reminders.length());
                    for (int i = 0; i < count; i++) {
                        JSONObject rem = reminders.optJSONObject(i);
                        if (rem == null) continue;

                        String unit = rem.optString("unit", "minutes");
                        int value = rem.optInt("value", 10);
                        int minutes = 10;

                        if ("minutes".equals(unit)) {
                            minutes = Math.max(0, value);
                        } else if ("hours".equals(unit)) {
                            minutes = Math.max(0, value * 60);
                        } else if ("days".equals(unit)) {
                            minutes = Math.max(0, value * 1440);
                        } else if ("exact".equals(unit)) {
                            String exactDate = rem.optString("exactDate", "");
                            String exactTime = rem.optString("exactTime", "");
                            if (!exactDate.isEmpty() && !exactTime.isEmpty()) {
                                try {
                                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US);
                                    Date exactDt = sdf.parse(exactDate + " " + exactTime);
                                    if (exactDt != null) {
                                        long diffMins = Math.round((effectiveStartMs - exactDt.getTime()) / 60000.0);
                                        minutes = (int) Math.max(0L, diffMins);
                                    }
                                } catch (Exception ignored) {}
                            }
                        }

                        ContentValues remValues = new ContentValues();
                        remValues.put(CalendarContract.Reminders.EVENT_ID, eventId);
                        remValues.put(CalendarContract.Reminders.MINUTES, minutes);
                        remValues.put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT);
                        resolver.insert(CalendarContract.Reminders.CONTENT_URI, remValues);
                    }
                } catch (Exception remEx) {
                    remEx.printStackTrace();
                }
            }

            return eventId;
        } catch (Exception e) {
            e.printStackTrace();
            return -1L;
        }
    }
}

