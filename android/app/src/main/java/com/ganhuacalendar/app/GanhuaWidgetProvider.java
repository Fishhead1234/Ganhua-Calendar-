package com.ganhuacalendar.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.util.Calendar;
import java.util.Locale;

public class GanhuaWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "GanhuaCalendarWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, GanhuaWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int widgetId : allWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        Calendar cal = Calendar.getInstance();
        int monthNum = cal.get(Calendar.MONTH) + 1;
        int dayNum = cal.get(Calendar.DAY_OF_MONTH);

        String monthStr = prefs.getString("month_str", monthNum + "月 / " + cal.getDisplayName(Calendar.MONTH, Calendar.SHORT, Locale.ENGLISH).toUpperCase());
        String dayStr = prefs.getString("day_str", String.valueOf(dayNum));
        String lunarStr = prefs.getString("lunar_str", "農曆日曆");
        String characterStr = prefs.getString("character_str", "🐱 厭世社畜貓");
        String quoteStr = prefs.getString("quote_str", "「每天都想辭職，但每天都準時上班。」");
        String yijiStr = prefs.getString("yiji_str", "宜：喝大杯冰美式・準時下班 / 忌：週五臨時會");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ganhua_desk_calendar);
        views.setTextViewText(R.id.tv_widget_month, monthStr);
        views.setTextViewText(R.id.tv_widget_day, dayStr);
        views.setTextViewText(R.id.tv_widget_lunar, lunarStr);
        views.setTextViewText(R.id.tv_widget_character, characterStr);
        views.setTextViewText(R.id.tv_widget_quote, quoteStr);
        views.setTextViewText(R.id.tv_widget_yiji, yijiStr);

        // Tap widget to launch app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}

