package com.ganhuacalendar.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentUris;
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
            CalendarContract.Calendars.IS_PRIMARY
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

                    JSONObject obj = new JSONObject();
                    obj.put("id", id);
                    obj.put("name", name);
                    obj.put("title", name);
                    obj.put("accountName", accountName != null ? accountName : "");
                    obj.put("color", colorHex);
                    obj.put("isPrimary", isPrimary);

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
                    obj.put("calendarId", String.valueOf(calId));
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
     * Schedule up to 3 custom reminder notifications for an event via AlarmManager
     */
    @JavascriptInterface
    public String scheduleEventNotifications(String eventJson) {
        try {
            JSONObject obj = new JSONObject(eventJson);
            String id = obj.optString("id");
            String title = obj.optString("title", "社畜行程");
            String dateKey = obj.optString("dateKey");
            int startHour = obj.optInt("startHour", 9);
            int startMinute = obj.optInt("startMinute", 0);
            boolean isAllDay = obj.optBoolean("isAllDay", false);
            String roast = obj.optString("roast");
            if (roast == null || roast.isEmpty()) {
                roast = generateFunnyMeetingRoast(title, startHour);
            }

            if (id == null || id.isEmpty() || dateKey == null || dateKey.isEmpty()) {
                return "{\"error\": \"Invalid event data\"}";
            }

            // Always cancel existing reminders for this event first
            cancelEventNotifications(id);

            JSONArray reminders = obj.optJSONArray("reminders");
            // If no reminders configured, default to 10 minutes before (or at start for all-day) like Google Calendar
            if (reminders == null || reminders.length() == 0) {
                reminders = new JSONArray();
                JSONObject defRem = new JSONObject();
                if (isAllDay) {
                    defRem.put("value", 0);
                    defRem.put("unit", "minutes");
                } else {
                    defRem.put("value", 10);
                    defRem.put("unit", "minutes");
                }
                reminders.put(defRem);
            }

            String[] parts = dateKey.split("-");
            if (parts.length < 3) return "{\"error\": \"Invalid dateKey format\"}";
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]) - 1;
            int day = Integer.parseInt(parts[2]);

            Calendar eventTime = Calendar.getInstance();
            eventTime.set(year, month, day, isAllDay ? 9 : startHour, isAllDay ? 0 : startMinute, 0);
            eventTime.set(Calendar.MILLISECOND, 0);
            long eventStartMs = eventTime.getTimeInMillis();

            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return "{\"error\": \"AlarmManager unavailable\"}";

            int scheduledCount = 0;
            int maxReminders = Math.min(reminders.length(), 3);
            long now = System.currentTimeMillis();

            for (int i = 0; i < maxReminders; i++) {
                JSONObject rem = reminders.getJSONObject(i);
                int val = rem.optInt("value", 10);
                String unit = rem.optString("unit", "minutes");

                long offsetMs;
                String unitText;
                if ("minutes".equals(unit)) {
                    offsetMs = (long) val * 60 * 1000L;
                    unitText = val == 0 ? "即刻開始" : (val + " 分鐘後開始");
                } else if ("days".equals(unit)) {
                    offsetMs = (long) val * 86400 * 1000L;
                    unitText = val + " 天後開始";
                } else {
                    offsetMs = (long) val * 3600 * 1000L;
                    unitText = val + " 小時後開始";
                }

                long triggerMs = eventStartMs - offsetMs;
                // Never schedule alarms for the past or immediate 5 seconds
                if (triggerMs <= now + 5000L) {
                    continue;
                }

                android.content.SharedPreferences prefs = context.getSharedPreferences("ganhua_reminders", Context.MODE_PRIVATE);
                String timeStr = String.format(Locale.getDefault(), "%02d:%02d", isAllDay ? 9 : startHour, isAllDay ? 0 : startMinute);
                String notifKey = dateKey + "_" + title + "_" + timeStr + "_" + i;
                if (prefs.getBoolean("fired_" + notifKey, false)) {
                    continue;
                }

                Intent intent = new Intent(context, EventReminderReceiver.class);
                intent.setAction(EventReminderReceiver.ACTION_EVENT_REMINDER);
                intent.putExtra("eventId", id);
                intent.putExtra("reminderIndex", i);
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
                scheduledCount++;
            }

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
                String id = obj.optString("id", "evt_" + e);
                String title = obj.optString("title", "社畜行程");
                String dateKey = obj.optString("dateKey");
                int startHour = obj.optInt("startHour", 9);
                int startMinute = obj.optInt("startMinute", 0);
                boolean isAllDay = obj.optBoolean("isAllDay", false);
                String roast = obj.optString("roast");
                if (roast == null || roast.isEmpty()) {
                    roast = generateFunnyMeetingRoast(title, startHour);
                }

                if (dateKey == null || dateKey.isEmpty()) continue;
                String[] parts = dateKey.split("-");
                if (parts.length < 3) continue;

                int year = Integer.parseInt(parts[0]);
                int month = Integer.parseInt(parts[1]) - 1;
                int day = Integer.parseInt(parts[2]);

                Calendar eventTime = Calendar.getInstance();
                eventTime.set(year, month, day, isAllDay ? 9 : startHour, isAllDay ? 0 : startMinute, 0);
                eventTime.set(Calendar.MILLISECOND, 0);
                long eventStartMs = eventTime.getTimeInMillis();

                // If event ended in the past, skip
                long durationMs = (long) obj.optInt("durationMinutes", 60) * 60 * 1000L;
                if (eventStartMs + durationMs < now) {
                    continue;
                }

                // If event is more than 14 days in future, skip
                if (eventStartMs - now > 14L * 86400 * 1000L) {
                    continue;
                }

                JSONArray reminders = obj.optJSONArray("reminders");
                // Default to 10 minutes before (or at start for all-day) like Google Calendar
                if (reminders == null || reminders.length() == 0) {
                    reminders = new JSONArray();
                    JSONObject defRem = new JSONObject();
                    if (isAllDay) {
                        defRem.put("value", 0);
                        defRem.put("unit", "minutes");
                    } else {
                        defRem.put("value", 10);
                        defRem.put("unit", "minutes");
                    }
                    reminders.put(defRem);
                }

                int maxRem = Math.min(reminders.length(), 3);
                for (int i = 0; i < maxRem; i++) {
                    JSONObject rem = reminders.getJSONObject(i);
                    int val = rem.optInt("value", 10);
                    String unit = rem.optString("unit", "minutes");

                    long offsetMs;
                    String unitText;
                    if ("minutes".equals(unit)) {
                        offsetMs = (long) val * 60 * 1000L;
                        unitText = val == 0 ? "即刻開始" : (val + " 分鐘後開始");
                    } else if ("days".equals(unit)) {
                        offsetMs = (long) val * 86400 * 1000L;
                        unitText = val + " 天後開始";
                    } else {
                        offsetMs = (long) val * 3600 * 1000L;
                        unitText = val + " 小時後開始";
                    }

                    long triggerMs = eventStartMs - offsetMs;
                    // Never schedule alarms for the past or immediate 5 seconds
                    if (triggerMs <= now + 5000L) {
                        continue;
                    }

                    String timeStr = String.format(Locale.getDefault(), "%02d:%02d", isAllDay ? 9 : startHour, isAllDay ? 0 : startMinute);
                    String notifKey = dateKey + "_" + title + "_" + timeStr + "_" + i;
                    if (prefs.getBoolean("fired_" + notifKey, false)) {
                        // Already notified to user
                        continue;
                    }

                    Intent intent = new Intent(context, EventReminderReceiver.class);
                    intent.setAction(EventReminderReceiver.ACTION_EVENT_REMINDER);
                    intent.putExtra("eventId", id);
                    intent.putExtra("reminderIndex", i);
                    intent.putExtra("title", title);
                    intent.putExtra("dateKey", dateKey);
                    intent.putExtra("timeStr", timeStr);
                    intent.putExtra("reminderText", unitText);
                    intent.putExtra("roast", roast);

                    // Stable deterministic request code based on notifKey
                    int requestCode = Math.abs(notifKey.hashCode());
                    int pendingFlag = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        pendingFlag |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, pendingFlag);

                    safeScheduleAlarm(am, triggerMs, pi);
                    totalScheduled++;
                }
            }

            return "{\"success\": true, \"scheduledCount\": " + totalScheduled + "}";
        } catch (Exception e) {
            e.printStackTrace();
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    /**
     * Cancel all active reminder notifications for an event
     */
    @JavascriptInterface
    public String cancelEventNotifications(String eventId) {
        if (eventId == null || eventId.isEmpty()) {
            return "{\"cancelled\": false}";
        }
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
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
}

