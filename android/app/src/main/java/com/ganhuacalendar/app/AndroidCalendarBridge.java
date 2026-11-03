package com.ganhuacalendar.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.webkit.JavascriptInterface;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
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
     * Returns all sub-calendars, including Parent Calendar (BSKL), SchoolsBuddy, Family, etc.
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
     * Expands recurring events (RRULE) and subscribed calendars (BSKL, SchoolsBuddy, Parent Calendar, Family).
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
}
