package com.ganhuacalendar.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.widget.RemoteViews;
import org.json.JSONArray;
import java.util.Calendar;
import java.util.Locale;

/**
 * Native Android 1x1 One-Tap "今日已生還" Stamp Widget
 * Allows users to stamp today's survival with 1 tap directly on the home screen
 * without opening the app, instantly refreshing all widgets and syncing to in-app calendar.
 */
public class SurvivalStampWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_STAMP_TODAY = "com.ganhuacalendar.app.ACTION_STAMP_TODAY";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (intent != null && ACTION_STAMP_TODAY.equals(intent.getAction())) {
            handleStampToday(context);
        }
    }

    private void handleStampToday(Context context) {
        try {
            Calendar cal = Calendar.getInstance();
            String todayYmd = String.format(Locale.getDefault(), "%04d-%02d-%02d",
                    cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));

            SharedPreferences prefs = context.getSharedPreferences(
                    GanhuaWidgetProvider.PREFS_NAME,
                    Context.MODE_PRIVATE
            );

            String survivedJson = prefs.getString("survived_dates_json", "[]");
            boolean alreadyStamped = false;
            JSONArray datesArray;
            try {
                datesArray = new JSONArray(survivedJson);
                for (int i = 0; i < datesArray.length(); i++) {
                    if (todayYmd.equals(datesArray.getString(i))) {
                        alreadyStamped = true;
                        break;
                    }
                }
            } catch (Exception e) {
                datesArray = new JSONArray();
            }

            int streakCount = prefs.getInt("streak_count", 3);
            if (!alreadyStamped) {
                datesArray.put(todayYmd);
                streakCount++;

                prefs.edit()
                        .putString("survived_dates_json", datesArray.toString())
                        .putInt("streak_count", streakCount)
                        .putString("streak_str", "🔥 連續生還 " + streakCount + " 天")
                        .putBoolean("has_pending_survived_sync", true)
                        .apply();
            }

            // Immediately refresh all 4 native widgets on the Home Screen
            updateAllWidgets(context);
            GanhuaWidgetProvider.updateAllWidgets(context);
            MonthlySplitWidgetProvider.updateAllWidgets(context);
            MonthlyLargeWidgetProvider.updateAllWidgets(context);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, SurvivalStampWidgetProvider.class);
            int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            for (int widgetId : allWidgetIds) {
                updateAppWidget(context, appWidgetManager, widgetId);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(
                    GanhuaWidgetProvider.PREFS_NAME,
                    Context.MODE_PRIVATE
            );

            Calendar cal = Calendar.getInstance();
            String todayYmd = String.format(Locale.getDefault(), "%04d-%02d-%02d",
                    cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));

            String survivedJson = prefs.getString("survived_dates_json", "[]");
            boolean isTodaySurvived = survivedJson.contains(todayYmd);
            int streakCount = prefs.getInt("streak_count", 3);

            // Render high-DPI 1x1 Bitmap Canvas
            Bitmap bitmap = renderStampBitmap(isTodaySurvived, streakCount);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_survival_stamp);
            views.setImageViewBitmap(R.id.iv_survival_stamp_canvas, bitmap);

            // 1-Tap Broadcast Action to Stamp Today
            Intent stampIntent = new Intent(context, SurvivalStampWidgetProvider.class);
            stampIntent.setAction(ACTION_STAMP_TODAY);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    stampIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_survival_stamp_root, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Renders high-fidelity vintage Taiwanese stationery card & stamp bitmap
     */
    private static Bitmap renderStampBitmap(boolean isTodaySurvived, int streakCount) {
        int size = 360;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);

        // 1. Warm cream stationery card background
        RectF cardRect = new RectF(10f, 10f, size - 10f, size - 10f);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.parseColor("#FAF7F0"));
        canvas.drawRoundRect(cardRect, 56f, 56f, paint);

        // 2. Outer dark charcoal border
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(9f);
        paint.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawRoundRect(cardRect, 56f, 56f, paint);

        if (!isTodaySurvived) {
            // ==========================================
            // STATE 1: Before Stamping (!isTodaySurvived)
            // ==========================================

            // Dashed inner circular outline
            Paint dashPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            dashPaint.setStyle(Paint.Style.STROKE);
            dashPaint.setStrokeWidth(3.5f);
            dashPaint.setColor(Color.parseColor("#9E988D"));
            dashPaint.setPathEffect(new DashPathEffect(new float[]{10f, 8f}, 0f));
            canvas.drawCircle(size / 2f, 138f, 76f, dashPaint);

            // Central icon
            paint.setStyle(Paint.Style.FILL);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTextSize(68f);
            canvas.drawText("💮", size / 2f, 142f, paint);

            // "點擊生還" action text
            paint.setColor(Color.parseColor("#2D2D2D"));
            paint.setTextSize(34f);
            paint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            canvas.drawText("點擊生還", size / 2f, 224f, paint);

            // Bottom streak pill
            RectF streakPill = new RectF(50f, 264f, size - 50f, 314f);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawRoundRect(streakPill, 25f, 25f, paint);

            paint.setColor(Color.parseColor("#FAF7F0"));
            paint.setTextSize(23f);
            paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            canvas.drawText("🔥 " + streakCount + " 天", size / 2f, 298f, paint);

        } else {
            // ==========================================
            // STATE 2: Stamped Today (isTodaySurvived)
            // ==========================================

            // Tilted vintage red seal stamp (-8 deg)
            canvas.save();
            canvas.rotate(-8f, size / 2f, 140f);

            // Double rectangular red stamp
            RectF outerSeal = new RectF(42f, 44f, size - 42f, 236f);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(7.5f);
            paint.setColor(Color.parseColor("#C83E31"));
            canvas.drawRoundRect(outerSeal, 24f, 24f, paint);

            // Thin inner border
            RectF innerSeal = new RectF(52f, 54f, size - 52f, 226f);
            paint.setStrokeWidth(2.5f);
            canvas.drawRoundRect(innerSeal, 18f, 18f, paint);

            // Stamp Text: "今日已生還"
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#C83E31"));
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTextSize(40f);
            paint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            canvas.drawText("今日已生還", size / 2f, 142f, paint);

            // Checkmark / English subtitle: "✓ SURVIVED"
            paint.setTextSize(22f);
            paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            canvas.drawText("✓ SURVIVED", size / 2f, 192f, paint);

            canvas.restore();

            // Bottom streak badge
            RectF streakPill = new RectF(40f, 264f, size - 40f, 314f);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#C83E31"));
            canvas.drawRoundRect(streakPill, 25f, 25f, paint);

            // Dark border around streak pill
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(3f);
            paint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawRoundRect(streakPill, 25f, 25f, paint);

            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#FAF7F0"));
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTextSize(23f);
            paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            canvas.drawText("🔥 連續 " + streakCount + " 天", size / 2f, 298f, paint);
        }

        return bitmap;
    }
}
