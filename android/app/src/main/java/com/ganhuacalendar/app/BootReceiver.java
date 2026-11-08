package com.ganhuacalendar.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            try {
                AndroidCalendarBridge bridge = new AndroidCalendarBridge(context);
                long now = System.currentTimeMillis();
                // Query upcoming 14 days from CalendarContract.Instances to reschedule alarms
                String eventsJson = bridge.getEventsInstancesJson(now, now + 14L * 86400 * 1000L);
                bridge.syncAllEventReminders(eventsJson);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
