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
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.widget.RemoteViews;
import android.widget.Toast;
import org.json.JSONArray;
import java.util.Calendar;
import java.util.Locale;

/**
 * Native Android 1x1 One-Tap "今日已生還" Stamp Widget
 * Provides instant tactile feedback: color-flip from cream to solid seal red,
 * haptic double vibration, native toast, and immediate sync to all home screen widgets.
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

            // 1. Crisp Double Haptic Pulse (feels like stamping a real physical seal)
            try {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 40, 60, 80}, -1));
                    } else {
                        vibrator.vibrate(new long[]{0, 40, 60, 80}, -1);
                    }
                }
            } catch (Exception ignored) {}

            // 2. Immediate Native Home Screen Toast Feedback
            if (!alreadyStamped) {
                Toast.makeText(context, "💮 打卡成功！今日已平安生還（🔥 連續 " + streakCount + " 天）", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(context, "💮 今天已經蓋過生還章囉！快去休息吧～", Toast.LENGTH_SHORT).show();
            }

            // 3. Force Instant Redraw of 1x1 Widget in under 0.1s
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, SurvivalStampWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(cn);
            if (ids != null && ids.length > 0) {
                for (int id : ids) {
                    updateAppWidget(context, manager, id);
                }
            }

            // 4. Also immediately refresh 4x2, 4x4 and daily desk widgets
            MonthlyLargeWidgetProvider.updateAllWidgets(context);
            MonthlySplitWidgetProvider.updateAllWidgets(context);
            GanhuaWidgetProvider.updateAllWidgets(context);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, SurvivalStampWidgetProvider.class);
            int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            if (allWidgetIds != null && allWidgetIds.length > 0) {
                for (int widgetId : allWidgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId);
                }
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

            // Render high-DPI 1x1 Canvas Bitmap with High-Contrast Color Flip
            Bitmap bitmap = renderStampBitmap(isTodaySurvived, streakCount);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_survival_stamp);
            views.setImageViewBitmap(R.id.iv_survival_stamp_canvas, bitmap);

            // 1-Tap Broadcast Action to Stamp Today with explicit PendingIntent
            Intent stampIntent = new Intent(context, SurvivalStampWidgetProvider.class);
            stampIntent.setAction(ACTION_STAMP_TODAY);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    stampIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_survival_stamp_root, pendingIntent);
            views.setOnClickPendingIntent(R.id.iv_survival_stamp_canvas, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Renders high-contrast physical seal card:
     * - Unstamped: Warm Cream (#F9F6F0) card + dark charcoal dashed border + "點擊\n生還"
     * - Stamped: Solid Traditional Seal Red (#C83E31) background + double white seal border + "💮 已生還\n✓"
     */
    private static Bitmap renderStampBitmap(boolean isTodaySurvived, int streakCount) {
        int size = 360;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        RectF cardRect = new RectF(10f, 10f, size - 10f, size - 10f);

        if (!isTodaySurvived) {
            // ==========================================
            // STATE 1: Unstamped State (!isTodaySurvived)
            // Warm Cream (#F9F6F0) + Charcoal Dashed Border
            // ==========================================

            // 1. Warm cream stationery card background
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#F9F6F0"));
            canvas.drawRoundRect(cardRect, 56f, 56f, paint);

            // 2. Charcoal dashed outer border
            Paint dashPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            dashPaint.setStyle(Paint.Style.STROKE);
            dashPaint.setStrokeWidth(7f);
            dashPaint.setColor(Color.parseColor("#2D2D2D"));
            dashPaint.setPathEffect(new DashPathEffect(new float[]{16f, 10f}, 0f));
            canvas.drawRoundRect(cardRect, 56f, 56f, dashPaint);

            // 3. Inner dashed circle
            dashPaint.setStrokeWidth(3.5f);
            dashPaint.setColor(Color.parseColor("#9E988D"));
            dashPaint.setPathEffect(new DashPathEffect(new float[]{10f, 8f}, 0f));
            canvas.drawCircle(size / 2f, 136f, 76f, dashPaint);

            // 4. Center icon & text: "點擊\n生還"
            paint.setStyle(Paint.Style.FILL);
            paint.setTextAlign(Paint.Align.CENTER);

            // Mini top flower icon
            paint.setColor(Color.parseColor("#C83E31"));
            paint.setTextSize(36f);
            canvas.drawText("💮", size / 2f, 106f, paint);

            // Charcoal "點擊" & "生還"
            paint.setColor(Color.parseColor("#2D2D2D"));
            paint.setTextSize(38f);
            paint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            canvas.drawText("點擊", size / 2f, 150f, paint);
            canvas.drawText("生還", size / 2f, 192f, paint);

            // 5. Bottom streak pill
            RectF streakPill = new RectF(52f, 264f, size - 52f, 314f);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawRoundRect(streakPill, 25f, 25f, paint);

            paint.setColor(Color.parseColor("#FAF7F0"));
            paint.setTextSize(22f);
            paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            canvas.drawText("🔥 " + streakCount + " 天", size / 2f, 298f, paint);

        } else {
            // ==========================================
            // STATE 2: Stamped State (isTodaySurvived)
            // High-Contrast Solid Traditional Seal Red (#C83E31)
            // ==========================================

            // 1. Flip card to Solid Traditional Seal Red (#C83E31)
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#C83E31"));
            canvas.drawRoundRect(cardRect, 56f, 56f, paint);

            // 2. Dark red outer framing rim
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(8f);
            paint.setColor(Color.parseColor("#9E2218"));
            canvas.drawRoundRect(cardRect, 56f, 56f, paint);

            // 3. Double white seal inner borders
            RectF outerWhiteSeal = new RectF(28f, 28f, size - 28f, size - 28f);
            paint.setColor(Color.WHITE);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(4.5f);
            canvas.drawRoundRect(outerWhiteSeal, 44f, 44f, paint);

            RectF innerWhiteSeal = new RectF(37f, 37f, size - 37f, size - 37f);
            paint.setStrokeWidth(1.5f);
            canvas.drawRoundRect(innerWhiteSeal, 38f, 38f, paint);

            // 4. White Bold Center Seal: "💮 已生還\n✓"
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.WHITE);
            paint.setTextAlign(Paint.Align.CENTER);

            // Line 1: "💮 已生還"
            paint.setTextSize(40f);
            paint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            canvas.drawText("💮 已生還", size / 2f, 138f, paint);

            // Line 2: "✓ SURVIVED"
            paint.setTextSize(22f);
            paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            canvas.drawText("✓ SURVIVED", size / 2f, 184f, paint);

            // 5. Bottom streak badge in white pill
            RectF streakPill = new RectF(48f, 258f, size - 48f, 308f);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.parseColor("#35FFFFFF"));
            canvas.drawRoundRect(streakPill, 25f, 25f, paint);

            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2f);
            paint.setColor(Color.WHITE);
            canvas.drawRoundRect(streakPill, 25f, 25f, paint);

            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.WHITE);
            paint.setTextSize(22f);
            paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            canvas.drawText("🔥 連續 " + streakCount + " 天", size / 2f, 292f, paint);
        }

        return bitmap;
    }
}
