package com.ganhuacalendar.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GanhuaWidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new AndroidCalendarBridge(this), "AndroidCalendarBridge");
        }
        handleWidgetSelectDate(getIntent());
        syncSurvivedDatesToWebView();
        refreshWidgets();
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
        if (selectDate != null && !selectDate.isEmpty()) {
            final String targetDate = selectDate;
            SharedPreferences prefs = getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("pending_widget_select_date", targetDate).apply();

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
}
