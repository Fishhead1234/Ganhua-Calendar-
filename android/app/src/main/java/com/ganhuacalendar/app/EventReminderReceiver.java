package com.ganhuacalendar.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class EventReminderReceiver extends BroadcastReceiver {
    public static final String ACTION_EVENT_REMINDER = "com.ganhuacalendar.app.ACTION_EVENT_REMINDER";
    public static final String CHANNEL_ID_REMINDERS = "ganhua_calendar_reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!ACTION_EVENT_REMINDER.equals(action)) return;

        String eventId = intent.getStringExtra("eventId");
        String title = intent.getStringExtra("title");
        String dateKey = intent.getStringExtra("dateKey");
        String timeStr = intent.getStringExtra("timeStr");
        String reminderText = intent.getStringExtra("reminderText");
        String roast = intent.getStringExtra("roast");
        int reminderIndex = intent.getIntExtra("reminderIndex", 0);

        if (title == null || title.isEmpty()) {
            title = "社畜行程";
        }
        if (reminderText == null || reminderText.isEmpty()) {
            reminderText = "行程提醒";
        }
        if (roast == null || roast.isEmpty()) {
            roast = "深呼吸，肉體出席點頭就好，靈魂請準時請假。";
        }

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // Ensure high-priority channel exists with sound, vibration, and heads-up banner
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = notificationManager.getNotificationChannel(CHANNEL_ID_REMINDERS);
            if (channel == null) {
                channel = new NotificationChannel(
                    CHANNEL_ID_REMINDERS,
                    "幹話日曆行程提醒",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("社畜行程提醒與專屬毒舌吐槽通知");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 150, 250});
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .build();
                channel.setSound(defaultSoundUri, audioAttributes);
                channel.setShowBadge(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                notificationManager.createNotificationChannel(channel);
            }
        }

        // Tap action: open MainActivity and jump to target date
        Intent tapIntent = new Intent(context, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (dateKey != null) {
            tapIntent.putExtra("jumpToYmd", dateKey);
            tapIntent.putExtra("select_date", dateKey);
        }

        int pendingFlag = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlag |= PendingIntent.FLAG_IMMUTABLE;
        }

        int notifId = (eventId != null ? (eventId + "_" + reminderIndex).hashCode() : (int) System.currentTimeMillis());
        PendingIntent contentPendingIntent = PendingIntent.getActivity(context, notifId, tapIntent, pendingFlag);

        String contentTitle = "🔔【" + reminderText + "】" + title;
        String contentText = (timeStr != null && !timeStr.isEmpty() ? timeStr + " • " : "") + roast;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID_REMINDERS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(contentTitle)
            .setContentText(contentText)
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText(contentText + "\n\n💡 社畜生存指引：左耳進右耳出，微笑點頭是最高防禦。"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(defaultSoundUri)
            .setVibrate(new long[]{0, 250, 150, 250})
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true);

        notificationManager.notify(notifId, builder.build());
    }
}
