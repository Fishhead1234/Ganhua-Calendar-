package com.ganhuacalendar.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;
import java.io.File;
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
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            Calendar cal = Calendar.getInstance();
            int dayNum = cal.get(Calendar.DAY_OF_MONTH);
            String monthEn = cal.getDisplayName(Calendar.MONTH, Calendar.SHORT, Locale.ENGLISH).toUpperCase();
            String weekdayEn = cal.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.SHORT, Locale.ENGLISH).toUpperCase();
            String defaultMonthStr = monthEn + " • " + weekdayEn;

            String monthStr = prefs.getString("month_str", defaultMonthStr);
            String dayStr = prefs.getString("day_str", String.valueOf(dayNum));
            String characterStr = prefs.getString("character_str", "🐱 厭世社畜貓");
            String characterKey = prefs.getString("character_key", "cat");
            String quoteStr = prefs.getString("quote_str", "週五下午四點後開會的人，靈魂注定得不到安息。");
            String yijiStr = prefs.getString("yiji_str", "宜：假裝網路不順退出會議・眼神渙散點頭");
            String offworkStr = prefs.getString("offwork_str", "目標 18:00 下班");
            String streakStr = prefs.getString("streak_str", "🔥 連續生還 3 天");

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ganhua_desk_calendar);
            views.setTextViewText(R.id.tv_widget_month, monthStr);
            views.setTextViewText(R.id.tv_widget_day, dayStr);
            views.setTextViewText(R.id.tv_widget_character, characterStr);
            views.setTextViewText(R.id.tv_widget_quote, quoteStr);
            views.setTextViewText(R.id.tv_widget_yiji, yijiStr);
            views.setTextViewText(R.id.tv_widget_offwork, offworkStr);
            views.setTextViewText(R.id.tv_widget_streak, streakStr);

            // Load exact scene illustration if custom avatar is available
            boolean loadedCustom = false;
            File avatarFile = new File(context.getFilesDir(), "widget_current_avatar.png");
            if (avatarFile.exists() && avatarFile.length() > 0) {
                try {
                    Bitmap bitmap = BitmapFactory.decodeFile(avatarFile.getAbsolutePath());
                    if (bitmap != null) {
                        views.setImageViewBitmap(R.id.iv_widget_avatar, bitmap);
                        loadedCustom = true;
                    }
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }

            // Fallback to default character icon if custom avatar is not yet generated
            if (!loadedCustom) {
                int avatarRes = R.drawable.widget_char_cat;
                if ("capybara".equals(characterKey)) {
                    avatarRes = R.drawable.widget_char_capybara;
                } else if ("ghost".equals(characterKey)) {
                    avatarRes = R.drawable.widget_char_ghost;
                }
                views.setImageViewResource(R.id.iv_widget_avatar, avatarRes);
            }

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
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
