package com.ganhuacalendar.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    public static final String CHANNEL_ID_REMINDERS = "ganhua_calendar_reminders";
    public static final int REQUEST_VOICE_SCHEDULE = 9102;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GanhuaWidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        requestNotificationPermissionIfNeeded();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new AndroidCalendarBridge(this), "AndroidCalendarBridge");
        }
        handleWidgetSelectDate(getIntent());
        syncSurvivedDatesToWebView();
        refreshWidgets();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID_REMINDERS,
                "幹話日曆行程提醒",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("社畜行程提醒與專屬毒舌吐槽通知");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build();
            channel.setSound(defaultSoundUri, audioAttributes);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 102);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetSelectDate(intent);
        syncSurvivedDatesToWebView();
        refreshWidgets();
    }

    private void handleWidgetSelectDate(Intent intent) {
        if (intent == null) return;
        String selectDate = intent.getStringExtra("select_date");
        if (selectDate == null || selectDate.isEmpty()) {
            selectDate = intent.getStringExtra("jumpToYmd");
        }
        if ((selectDate == null || selectDate.isEmpty()) && intent.getData() != null) {
            String segment = intent.getData().getLastPathSegment();
            if (segment != null && segment.matches("\\d{4}-\\d{2}-\\d{2}")) {
                selectDate = segment;
            }
        }
        if (selectDate != null && !selectDate.isEmpty()) {
            final String targetDate = selectDate;
            SharedPreferences prefs = getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                    .putString("pending_widget_select_date", targetDate)
                    .putString("pending_widget_date", targetDate)
                    .apply();

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            String js = "window.dispatchEvent(new CustomEvent('widgetSelectDate', { detail: '" + targetDate + "' }));";
                            bridge.getWebView().evaluateJavascript(js, null);
                        } catch (Exception ignored) {}
                    }
                });
            }
        }
    }

    private void syncSurvivedDatesToWebView() {
        try {
            SharedPreferences prefs = getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            boolean hasPending = prefs.getBoolean("has_pending_survived_sync", false);
            final String survivedJson = prefs.getString("survived_dates_json", "[]");
            final int streakCount = prefs.getInt("streak_count", 3);

            if (hasPending) {
                prefs.edit().putBoolean("has_pending_survived_sync", false).apply();
            }

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            String js = "window.dispatchEvent(new CustomEvent('widgetSurvivedSync', { detail: { survivedDates: " + survivedJson + ", streakCount: " + streakCount + " } }));";
                            bridge.getWebView().evaluateJavascript(js, null);
                        } catch (Exception ignored) {}
                    }
                });
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        syncSurvivedDatesToWebView();
        refreshWidgets();
    }

    private void refreshWidgets() {
        try {
            GanhuaWidgetProvider.updateAllWidgets(this);
            MonthlySplitWidgetProvider.updateAllWidgets(this);
            MonthlyLargeWidgetProvider.updateAllWidgets(this);
            SurvivalStampWidgetProvider.updateAllWidgets(this);
        } catch (Exception ignored) {
        }
    }

    public void launchVoiceScheduleRecognizer() {
        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-TW");
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "請說出行程，例如：明天下午三點部門週會");
            startActivityForResult(intent, REQUEST_VOICE_SCHEDULE);
        } catch (ActivityNotFoundException e) {
            dispatchVoiceEvent("voiceScheduleError", "此裝置尚未安裝語音辨識服務，請改用文字輸入");
        } catch (Exception e) {
            dispatchVoiceEvent("voiceScheduleError", "語音辨識啟動失敗，請改用文字輸入");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_VOICE_SCHEDULE && resultCode == RESULT_OK && data != null) {
            ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (results != null && !results.isEmpty()) {
                String spokenText = results.get(0);
                if (spokenText != null && !spokenText.trim().isEmpty()) {
                    dispatchVoiceEvent("voiceScheduleResult", spokenText.trim());
                }
            }
        }
    }

    private void dispatchVoiceEvent(final String eventName, final String detailText) {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    try {
                        String quoted = JSONObject.quote(detailText != null ? detailText : "");
                        String js = "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: " + quoted + " }));";
                        bridge.getWebView().evaluateJavascript(js, null);
                    } catch (Exception ignored) {}
                }
            });
        }
    }
}
