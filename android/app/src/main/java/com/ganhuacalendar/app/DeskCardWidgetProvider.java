package com.ganhuacalendar.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.widget.RemoteViews;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 4x5 Resizable Interactive Tear-Off Daily Desk Calendar Widget
 * Replicates the in-app Desk Calendar with vintage paper aesthetic, brass rings,
 * 3D stacked sheets, real paper tear audio & haptics, and 2-frame peel animation.
 */
public class DeskCardWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_DESK_PREV_DAY = "com.ganhuacalendar.app.ACTION_DESK_PREV_DAY";
    public static final String ACTION_DESK_TEAR_NEXT = "com.ganhuacalendar.app.ACTION_DESK_TEAR_NEXT";
    public static final String ACTION_DESK_STAMP = "com.ganhuacalendar.app.ACTION_DESK_STAMP";
    public static final String ACTION_DESK_LOCKED = "com.ganhuacalendar.app.ACTION_DESK_LOCKED";
    public static final String EXTRA_DATE_KEY = "date_key";

    public static final String PREF_DESK_DATE = "widget_desk_card_date";
    public static final String PREF_LAST_TORN_TO_DATE = "last_torn_to_date";
    public static final String PREF_IS_TODAY_UNLOCKED = "is_today_unlocked";

    private static final String[] CHINESE_MONTH_NAMES = {
        "一月", "二月", "三月", "四月", "五月", "六月",
        "七月", "八月", "九月", "十月", "十一月", "十二月"
    };

    private static final String[] CHINESE_WEEKDAYS = {
        "星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"
    };

    private static final String[] CHINESE_LUNAR_DAYS = {
        "",
        "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
        "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
    };

    private static final String[] YI_SAMPLES = {
        "喝大杯冰美式・準時打卡下班",
        "帶薪上廁所十五分鐘・安靜放空",
        "戴抗噪耳機裝忙・只回貼圖與收到",
        "點全糖黑糖珍奶・開啟勿擾模式",
        "把今天的工作留給明天的自己",
        "假裝在深入思考系統架構",
        "準時關機人間蒸發",
        "逛網購清空購物車・午休睡飽"
    };

    private static final String[] JI_SAMPLES = {
        "在週五下午四點答應「順便開個會」",
        "認真打開銀行帳戶看存款餘額",
        "相信共體時艱與明年調薪大餅",
        "在下班前五分鐘主動問「還有事嗎」",
        "接聽沒有事先傳訊息預告的電話",
        "在週五下午五點進行正式環境部署",
        "睡前滑手機不小心點開公司群組",
        "相信「這場會只要十分鐘就結束」"
    };

    private static final String[] LUCKY_SLACK_TIMES = {
        "14:00 - 15:30 (午後昏睡避風港)",
        "10:30 - 11:30 (認真思索午餐菜單)",
        "15:45 - 16:45 (下午茶揪團偷喝)",
        "11:00 - 12:00 (預熱滑手機等午休)",
        "16:30 - 17:30 (靈魂提前收拾離線)",
        "13:30 - 14:30 (假裝盯著架構圖發呆)",
        "09:45 - 10:45 (廁所深度帶薪冥想)"
    };

    // Cached quotes from quotes365.json
    private static Map<String, DeskDayQuote> sQuotesCache = null;
    // Cached sprite sheets
    private static final Map<String, Bitmap> sSheetBitmaps = new HashMap<>();

    public static class DeskDayQuote {
        public int month;
        public int day;
        public String dateKey; // "11-09"
        public String quote;
        public String subtext;
        public String character;
        public String spriteSheet;
        public String spritePosition;
        public String yi;
        public String ji;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, false);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, DeskCardWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int widgetId : allWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId, false);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent != null ? intent.getAction() : null;
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

        Calendar todayCal = Calendar.getInstance();
        String todayKey = sdf.format(todayCal.getTime());

        String currentCardDate = getEffectiveCardDate(prefs, todayKey);

        if (ACTION_DESK_PREV_DAY.equals(action)) {
            // Flip back to previous day
            try {
                Calendar c = Calendar.getInstance();
                c.setTime(sdf.parse(currentCardDate));
                c.add(Calendar.DAY_OF_MONTH, -1);
                String prevDate = sdf.format(c.getTime());
                prefs.edit().putString(PREF_DESK_DATE, prevDate).apply();

                vibrateTick(context, 15);
                updateAllWidgets(context);
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else if (ACTION_DESK_TEAR_NEXT.equals(action)) {
            // Handle tear-forward ritual
            if (currentCardDate.compareTo(todayKey) >= 0) {
                // Today or future is locked
                handleLockedBounce(context);
                return;
            }

            try {
                Calendar c = Calendar.getInstance();
                c.setTime(sdf.parse(currentCardDate));
                c.add(Calendar.DAY_OF_MONTH, 1);
                final String nextDate = sdf.format(c.getTime());

                // 1. Play realistic paper tear sound
                playTearSound(context);

                // 2. Trigger realistic 5-pulse perforated paper tear haptic pattern
                vibratePerforation(context);

                // 3. Step A: Render the 2-step peel animation frame (peeling current sheet over next sheet)
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                ComponentName thisWidget = new ComponentName(context, DeskCardWidgetProvider.class);
                int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
                for (int widgetId : allWidgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId, true);
                }

                // 4. Step B: After 180ms delay, advance date and redraw clean new card
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    SharedPreferences.Editor editor = prefs.edit();
                    editor.putString(PREF_DESK_DATE, nextDate);

                    if (nextDate.equals(todayKey)) {
                        editor.putString(PREF_LAST_TORN_TO_DATE, todayKey);
                        editor.putBoolean(PREF_IS_TODAY_UNLOCKED, true);
                        editor.putBoolean("has_pending_torn_sync", true);
                        Toast.makeText(context.getApplicationContext(), "✨ 撕下昨日日曆，已解鎖今日幹話！", Toast.LENGTH_SHORT).show();
                    }
                    editor.apply();

                    // Refresh all widgets
                    updateAllWidgets(context);
                    GanhuaWidgetProvider.updateAllWidgets(context);
                    MonthlySplitWidgetProvider.updateAllWidgets(context);
                    MonthlyLargeWidgetProvider.updateAllWidgets(context);
                }, 180);
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else if (ACTION_DESK_STAMP.equals(action)) {
            // Stamp "今日已生還"
            handleStampAction(context, currentCardDate, todayKey);
        } else if (ACTION_DESK_LOCKED.equals(action)) {
            handleLockedBounce(context);
        }
    }

    private static String getEffectiveCardDate(SharedPreferences prefs, String todayKey) {
        String savedDate = prefs.getString(PREF_DESK_DATE, null);
        String lastTorn = prefs.getString(PREF_LAST_TORN_TO_DATE, "");
        boolean isTodayUnlocked = prefs.getBoolean(PREF_IS_TODAY_UNLOCKED, false) || todayKey.equals(lastTorn);

        if (savedDate != null && !savedDate.isEmpty()) {
            // If user previously browsed to a date, honor it unless it's past today
            if (savedDate.compareTo(todayKey) > 0) {
                return todayKey;
            }
            return savedDate;
        }

        // On a fresh morning before today is torn:
        if (isTodayUnlocked) {
            return todayKey;
        } else {
            // Default to yesterday so user gets to tear off page to reveal today
            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.DAY_OF_MONTH, -1);
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            return sdf.format(cal.getTime());
        }
    }

    private static void handleLockedBounce(Context context) {
        vibrateLocked(context);
        Toast.makeText(context.getApplicationContext(), "🔮 明天的幹話還在封印中，先活過今天吧！", Toast.LENGTH_SHORT).show();
    }

    private static void handleStampAction(Context context, String cardDate, String todayKey) {
        SharedPreferences prefs = context.getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        String survivedJson = prefs.getString("survived_dates_json", "[]");
        boolean alreadyStamped = survivedJson.contains(cardDate);

        if (alreadyStamped) {
            Toast.makeText(context.getApplicationContext(), "💮 當日已蓋章生還囉！平安下班萬歲！", Toast.LENGTH_SHORT).show();
            vibrateTick(context, 20);
            return;
        }

        try {
            JSONArray arr;
            try {
                arr = new JSONArray(survivedJson);
            } catch (Exception ex) {
                arr = new JSONArray();
            }
            arr.put(cardDate);

            int streak = prefs.getInt("streak_count", 3);
            if (cardDate.equals(todayKey)) {
                streak++;
            }

            prefs.edit()
                    .putString("survived_dates_json", arr.toString())
                    .putInt("streak_count", streak)
                    .putString("streak_str", "🔥 連續生還 " + streak + " 天")
                    .putBoolean("has_pending_survived_sync", true)
                    .apply();

            vibrateStamp(context);
            Toast.makeText(context.getApplicationContext(), "💮 蓋章成功！今日已平安生還，已累積生還 " + streak + " 天", Toast.LENGTH_SHORT).show();

            // Refresh all widgets
            updateAllWidgets(context);
            GanhuaWidgetProvider.updateAllWidgets(context);
            MonthlySplitWidgetProvider.updateAllWidgets(context);
            MonthlyLargeWidgetProvider.updateAllWidgets(context);
            SurvivalStampWidgetProvider.updateAllWidgets(context);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId, boolean isPeeling) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

            Calendar todayCal = Calendar.getInstance();
            String todayKey = sdf.format(todayCal.getTime());
            String cardDate = getEffectiveCardDate(prefs, todayKey);

            // Generate crisp 800x1000 Desk Calendar Card Bitmap
            Bitmap cardBitmap = renderDeskCalendarCardBitmap(context, prefs, cardDate, todayKey, isPeeling);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_desk_card);
            views.setImageViewBitmap(R.id.iv_desk_card_canvas, cardBitmap);

            // 1. Prev Day Button PendingIntent
            Intent prevIntent = new Intent(context, DeskCardWidgetProvider.class);
            prevIntent.setAction(ACTION_DESK_PREV_DAY);
            PendingIntent prevPending = PendingIntent.getBroadcast(
                    context, 101, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_desk_prev_day, prevPending);

            // 2. Tear Next / Tomorrow Locked PendingIntent
            boolean isPastDate = cardDate.compareTo(todayKey) < 0;
            Intent tearIntent = new Intent(context, DeskCardWidgetProvider.class);
            tearIntent.setAction(isPastDate ? ACTION_DESK_TEAR_NEXT : ACTION_DESK_LOCKED);
            PendingIntent tearPending = PendingIntent.getBroadcast(
                    context, 102, tearIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_desk_tear_action, tearPending);

            // 3. Stamp "今日已生還" Button PendingIntent
            Intent stampIntent = new Intent(context, DeskCardWidgetProvider.class);
            stampIntent.setAction(ACTION_DESK_STAMP);
            PendingIntent stampPending = PendingIntent.getBroadcast(
                    context, 103, stampIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_desk_stamp, stampPending);

            // 4. App Launchers (Binder, Date Header, Illustration, Quote, Agenda Strip)
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openAppIntent.putExtra(EXTRA_DATE_KEY, cardDate);
            PendingIntent openAppPending = PendingIntent.getActivity(
                    context, 104, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.desk_top_binder_touch, openAppPending);
            views.setOnClickPendingIntent(R.id.desk_strip_center_touch, openAppPending);
            views.setOnClickPendingIntent(R.id.desk_date_header_touch, openAppPending);
            views.setOnClickPendingIntent(R.id.desk_illustration_touch, openAppPending);
            views.setOnClickPendingIntent(R.id.desk_quote_touch, openAppPending);
            views.setOnClickPendingIntent(R.id.btn_desk_agenda, openAppPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private static Bitmap renderDeskCalendarCardBitmap(
            Context context, SharedPreferences prefs, String cardDate, String todayKey, boolean isPeeling) {

        int width = 800;
        int height = 1000;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        boolean isToday = cardDate.equals(todayKey);
        boolean isPast = cardDate.compareTo(todayKey) < 0;

        // 1. Draw 3D Stacked Desk Calendar Background Sheets (for authentic depth)
        drawStackedDeskSheets(canvas, width, height);

        if (isPeeling && isPast) {
            // STEP A: 2-Frame Peel Animation
            // A. Draw the NEXT day's card crisp & flat underneath
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                Calendar c = Calendar.getInstance();
                c.setTime(sdf.parse(cardDate));
                c.add(Calendar.DAY_OF_MONTH, 1);
                String nextDate = sdf.format(c.getTime());

                drawSingleDeskCard(canvas, context, prefs, nextDate, todayKey, false, width, height);
            } catch (Exception ignored) {}

            // B. Draw CURRENT day's sheet tilted at -12deg peeling down and left
            canvas.save();
            canvas.translate(-35f, 75f);
            canvas.rotate(-12f, 400f, 200f);

            // Peel Sheet Drop Shadow
            Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            shadowPaint.setColor(Color.parseColor("#44000000"));
            RectF peelShadowRect = new RectF(15, 140, 785, 965);
            canvas.drawRoundRect(peelShadowRect, 26, 26, shadowPaint);

            // Draw current peeled page body with sawtooth torn top edge
            drawSingleDeskCard(canvas, context, prefs, cardDate, todayKey, true, width, height);
            canvas.restore();

            // Re-draw the fixed top black binder clamp on top
            drawTopBinderClamp(canvas, "GAN-HUA DESK CALENDAR", "✂️ 撕頁中...", width);
        } else {
            // Regular crisp desk calendar view
            drawSingleDeskCard(canvas, context, prefs, cardDate, todayKey, false, width, height);
        }

        return bitmap;
    }

    private static void drawStackedDeskSheets(Canvas canvas, int width, int height) {
        // Back Sheet 1 (rotated +1.2deg)
        canvas.save();
        canvas.rotate(1.2f, width / 2f, height / 2f);
        Paint sheet1Paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        sheet1Paint.setColor(Color.parseColor("#EAE3D5"));
        RectF r1 = new RectF(22, 28, width - 22, height - 24);
        canvas.drawRoundRect(r1, 30, 30, sheet1Paint);
        Paint border1 = new Paint(Paint.ANTI_ALIAS_FLAG);
        border1.setStyle(Paint.Style.STROKE);
        border1.setStrokeWidth(2.2f);
        border1.setColor(Color.parseColor("#4D2D2D2D"));
        canvas.drawRoundRect(r1, 30, 30, border1);
        canvas.restore();

        // Back Sheet 2 (rotated -0.8deg)
        canvas.save();
        canvas.rotate(-0.8f, width / 2f, height / 2f);
        Paint sheet2Paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        sheet2Paint.setColor(Color.parseColor("#F2ECE1"));
        RectF r2 = new RectF(16, 22, width - 16, height - 26);
        canvas.drawRoundRect(r2, 30, 30, sheet2Paint);
        Paint border2 = new Paint(Paint.ANTI_ALIAS_FLAG);
        border2.setStyle(Paint.Style.STROKE);
        border2.setStrokeWidth(2.5f);
        border2.setColor(Color.parseColor("#662D2D2D"));
        canvas.drawRoundRect(r2, 30, 30, border2);
        canvas.restore();
    }

    private static void drawSingleDeskCard(
            Canvas canvas, Context context, SharedPreferences prefs,
            String cardDate, String todayKey, boolean isDetachedPeel, int width, int height) {

        boolean isToday = cardDate.equals(todayKey);
        boolean isPast = cardDate.compareTo(todayKey) < 0;

        DeskDayQuote quote = getQuoteForDate(context, cardDate);
        String survivedJson = prefs.getString("survived_dates_json", "[]");
        boolean isSurvived = survivedJson.contains(cardDate);

        // Date breakdown
        int year = 2026;
        int month = 11;
        int day = 9;
        int dayOfWeek = Calendar.MONDAY;
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Calendar c = Calendar.getInstance();
            c.setTime(sdf.parse(cardDate));
            year = c.get(Calendar.YEAR);
            month = c.get(Calendar.MONTH) + 1;
            day = c.get(Calendar.DAY_OF_MONTH);
            dayOfWeek = c.get(Calendar.DAY_OF_WEEK);
        } catch (Exception ignored) {}

        boolean isWeekend = (dayOfWeek == Calendar.SUNDAY || dayOfWeek == Calendar.SATURDAY);
        String weekdayZh = CHINESE_WEEKDAYS[dayOfWeek - 1];
        String monthZh = (month >= 1 && month <= 12) ? CHINESE_MONTH_NAMES[month - 1] : month + "月";

        RectF cardRect = new RectF(10, 16, width - 10, height - 28);
        Path cardPath = new Path();
        cardPath.addRoundRect(cardRect, 30, 30, Path.Direction.CW);

        canvas.save();
        canvas.clipPath(cardPath);

        // Paper Texture Base (#FAF7F0 Warm Cream)
        Paint paperBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        paperBg.setColor(Color.parseColor("#FAF7F0"));
        canvas.drawRect(cardRect, paperBg);

        // Card Border
        Paint cardBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardBorder.setStyle(Paint.Style.STROKE);
        cardBorder.setStrokeWidth(3.0f);
        cardBorder.setColor(Color.parseColor("#2D2D2D"));

        // 1. Top Binder Bar (Fixed black clamp with brass rivets)
        if (!isDetachedPeel) {
            String charBadge = getCharacterBadge(quote.character);
            drawTopBinderClamp(canvas, "GAN-HUA DESK CALENDAR", charBadge, width);
        }

        // 2. Perforated Binding Stub / Tear Strip (y = 70 to 148)
        float stubTop = 70f;
        float stubBottom = 148f;
        Paint stubBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        if (!isToday && isPast) {
            stubBg.setColor(Color.parseColor("#FFF8E7")); // Highlighted amber before today is torn
        } else {
            stubBg.setColor(Color.parseColor("#F3EFE6"));
        }
        canvas.drawRect(10, stubTop, width - 10, stubBottom, stubBg);

        // Perforation dashed line at stub bottom
        Paint dashedPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dashedPaint.setStyle(Paint.Style.STROKE);
        dashedPaint.setStrokeWidth(2.0f);
        dashedPaint.setColor(Color.parseColor("#402D2D2D"));
        dashedPaint.setPathEffect(new DashPathEffect(new float[]{8, 6}, 0));
        canvas.drawLine(10, stubBottom, width - 10, stubBottom, dashedPaint);

        // Strip Left Button: [ < 前一日 ]
        RectF prevBtnRect = new RectF(30, 86, 175, 134);
        Paint prevBtnBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        prevBtnBg.setColor(Color.parseColor("#FAF7F0"));
        canvas.drawRoundRect(prevBtnRect, 20, 20, prevBtnBg);
        Paint prevBtnBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        prevBtnBorder.setStyle(Paint.Style.STROKE);
        prevBtnBorder.setStrokeWidth(1.6f);
        prevBtnBorder.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawRoundRect(prevBtnRect, 20, 20, prevBtnBorder);

        Paint prevTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        prevTextPaint.setTypeface(Typeface.DEFAULT_BOLD);
        prevTextPaint.setTextSize(17);
        prevTextPaint.setColor(Color.parseColor("#2D2D2D"));
        prevTextPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("‹ 前一日", prevBtnRect.centerX(), 116, prevTextPaint);

        // Strip Center Status
        Paint centerStatusPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        centerStatusPaint.setTextSize(15);
        centerStatusPaint.setTextAlign(Paint.Align.CENTER);
        if (isPast) {
            centerStatusPaint.setTypeface(Typeface.DEFAULT_BOLD);
            centerStatusPaint.setColor(Color.parseColor("#C83E31"));
            canvas.drawText("✨ 撕頁解鎖今日", 330, 115, centerStatusPaint);
        } else {
            centerStatusPaint.setColor(Color.parseColor("#6E6A63"));
            canvas.drawText("✂️ 今日存活中", 330, 115, centerStatusPaint);
        }

        // Strip Right Button: [ ✂️ 點擊撕頁解鎖 ↘ ] or [ 🔒 明日封印中 ]
        if (isPast) {
            RectF tearBtnRect = new RectF(480, 84, 768, 136);
            Paint tearBtnBg = new Paint(Paint.ANTI_ALIAS_FLAG);
            tearBtnBg.setColor(Color.parseColor("#C83E31")); // Red highlight
            canvas.drawRoundRect(tearBtnRect, 22, 22, tearBtnBg);

            Paint goldRing = new Paint(Paint.ANTI_ALIAS_FLAG);
            goldRing.setStyle(Paint.Style.STROKE);
            goldRing.setStrokeWidth(2.0f);
            goldRing.setColor(Color.parseColor("#D4B483"));
            canvas.drawRoundRect(tearBtnRect, 22, 22, goldRing);

            Paint tearTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            tearTextPaint.setTypeface(Typeface.DEFAULT_BOLD);
            tearTextPaint.setTextSize(17);
            tearTextPaint.setColor(Color.WHITE);
            tearTextPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("✂️ 點擊撕頁解鎖 ↘", tearBtnRect.centerX(), 116, tearTextPaint);
        } else {
            RectF lockedBtnRect = new RectF(540, 86, 768, 134);
            Paint lockedBtnBg = new Paint(Paint.ANTI_ALIAS_FLAG);
            lockedBtnBg.setColor(Color.parseColor("#262D2D2D"));
            canvas.drawRoundRect(lockedBtnRect, 20, 20, lockedBtnBg);

            Paint lockedTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            lockedTextPaint.setTypeface(Typeface.DEFAULT_BOLD);
            lockedTextPaint.setTextSize(16);
            lockedTextPaint.setColor(Color.parseColor("#6E6A63"));
            lockedTextPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("🔒 明日封印中", lockedBtnRect.centerX(), 116, lockedTextPaint);
        }

        // 3. Sawtooth Jagged Tear Edge (physical paper fibers)
        drawSawtoothEdge(canvas, stubBottom, width);

        // 4. Date Header (y = 154 to 275)
        float headerY = 154f;
        float headerBottom = 275f;
        Paint headerDivider = new Paint(Paint.ANTI_ALIAS_FLAG);
        headerDivider.setColor(Color.parseColor("#2D2D2D"));
        headerDivider.setStrokeWidth(2.5f);
        canvas.drawLine(30, headerY, width - 30, headerY, headerDivider);
        canvas.drawLine(30, headerBottom, width - 30, headerBottom, headerDivider);

        // Vertical divider at x = 220
        canvas.drawLine(220, headerY, 220, headerBottom, headerDivider);

        // Left: Month + Day Number
        Paint monthPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        monthPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        monthPaint.setTextSize(23);
        monthPaint.setColor(Color.parseColor("#2D2D2D"));
        monthPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(monthZh, 125, 195, monthPaint);

        Paint bigDayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bigDayPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        bigDayPaint.setTextSize(70);
        bigDayPaint.setColor(isWeekend ? Color.parseColor("#C83E31") : Color.parseColor("#2D2D2D"));
        bigDayPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(String.valueOf(day), 125, 263, bigDayPaint);

        // Right: Weekday + Lunar Date & Solar Term + Tag
        Paint weekdayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        weekdayPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        weekdayPaint.setTextSize(26);
        weekdayPaint.setColor(isWeekend ? Color.parseColor("#C83E31") : Color.parseColor("#2D2D2D"));
        canvas.drawText(weekdayZh, 248, 198, weekdayPaint);

        String lunarDesc = getLunarDescription(year, month - 1, day);
        Paint lunarPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        lunarPaint.setTextSize(20);
        lunarPaint.setColor(Color.parseColor("#6E6A63"));
        canvas.drawText("農曆 " + lunarDesc, 248, 234, lunarPaint);

        Paint tagPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        tagPaint.setTypeface(Typeface.DEFAULT_BOLD);
        tagPaint.setTextSize(16);
        tagPaint.setColor(Color.parseColor("#785A3C"));
        canvas.drawText("[ 📅 幹話日曆・社畜指南 ]", 248, 264, tagPaint);

        // 5. Center Illustration Frame & Exact Sprite Cropping (y = 285 to 630)
        float illTop = 285f;
        float illBottom = 630f;
        RectF illFrame = new RectF(45, illTop, width - 45, illBottom);
        Paint illBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        illBg.setColor(Color.parseColor("#FAF7F0"));
        canvas.drawRoundRect(illFrame, 24, 24, illBg);

        Paint illBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        illBorder.setStyle(Paint.Style.STROKE);
        illBorder.setStrokeWidth(2.0f);
        illBorder.setColor(Color.parseColor("#332D2D2D"));
        canvas.drawRoundRect(illFrame, 24, 24, illBorder);

        // Crop & Draw Character Sprite Illustration
        Bitmap spriteBitmap = getSpriteCellBitmap(context, quote.spriteSheet, quote.spritePosition, quote.character);
        if (spriteBitmap != null) {
            float illCenterY = (illTop + illBottom) / 2f;
            float spriteSize = 310f;
            RectF dstRect = new RectF(
                    (width - spriteSize) / 2f,
                    illCenterY - spriteSize / 2f,
                    (width + spriteSize) / 2f,
                    illCenterY + spriteSize / 2f
            );
            Bitmap roundedSprite = getRoundedBitmap(spriteBitmap, 22);
            canvas.drawBitmap(roundedSprite, null, dstRect, null);
        }

        // Draw Survival Stamp "💮 今日已生還"
        float stampX = 640f;
        float stampY = 530f;
        drawSurvivalSeal(canvas, stampX, stampY, isSurvived, isPast);

        // 6. Core Sarcastic Quote & Subtext (y = 642 to 795)
        float quoteTop = 642f;
        TextPaint quotePaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        quotePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        quotePaint.setTextSize(29);
        quotePaint.setColor(Color.parseColor("#2D2D2D"));

        String displayQuote = "「" + quote.quote + "」";
        StaticLayout quoteLayout = new StaticLayout(
                displayQuote,
                quotePaint,
                width - 100,
                Layout.Alignment.ALIGN_CENTER,
                1.22f,
                0.0f,
                false
        );

        canvas.save();
        canvas.translate(50, quoteTop);
        quoteLayout.draw(canvas);
        canvas.restore();

        float subtextY = quoteTop + quoteLayout.getHeight() + 18;
        Paint subtextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subtextPaint.setTextSize(18);
        subtextPaint.setColor(Color.parseColor("#6E6A63"));
        subtextPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(quote.subtext, width / 2f, subtextY, subtextPaint);

        // 7. 社畜農民曆 & Synced Agenda Strip (y = 808 to 965)
        float almTop = 808f;
        float almBottom = 965f;
        RectF almRect = new RectF(40, almTop, width - 40, almBottom);
        Paint almBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        almBg.setColor(Color.parseColor("#FBF8F2"));
        canvas.drawRoundRect(almRect, 22, 22, almBg);

        Paint almBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        almBorder.setStyle(Paint.Style.STROKE);
        almBorder.setStrokeWidth(2.0f);
        almBorder.setColor(Color.parseColor("#66C83E31"));
        canvas.drawRoundRect(almRect, 22, 22, almBorder);

        // Badge: "社畜農民曆"
        RectF badgeRect = new RectF(60, almTop - 12, 185, almTop + 14);
        Paint badgeBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        badgeBg.setColor(Color.parseColor("#C83E31"));
        canvas.drawRoundRect(badgeRect, 13, 13, badgeBg);
        Paint badgeText = new Paint(Paint.ANTI_ALIAS_FLAG);
        badgeText.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        badgeText.setTextSize(14);
        badgeText.setColor(Color.WHITE);
        badgeText.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("社畜農民曆", badgeRect.centerX(), badgeRect.centerY() + 5, badgeText);

        // Row 1: 宜 (y = 852)
        Paint yiLabel = new Paint(Paint.ANTI_ALIAS_FLAG);
        yiLabel.setTypeface(Typeface.DEFAULT_BOLD);
        yiLabel.setTextSize(18);
        yiLabel.setColor(Color.parseColor("#C83E31"));
        canvas.drawText("宜：", 65, 852, yiLabel);

        Paint yiContent = new Paint(Paint.ANTI_ALIAS_FLAG);
        yiContent.setTextSize(18);
        yiContent.setColor(Color.parseColor("#2D2D2D"));
        String yiStr = quote.yi.length() > 22 ? quote.yi.substring(0, 21) + "…" : quote.yi;
        canvas.drawText(yiStr, 105, 852, yiContent);

        // Row 2: 忌 (y = 888)
        Paint jiLabel = new Paint(Paint.ANTI_ALIAS_FLAG);
        jiLabel.setTypeface(Typeface.DEFAULT_BOLD);
        jiLabel.setTextSize(18);
        jiLabel.setColor(Color.parseColor("#6E6A63"));
        canvas.drawText("忌：", 65, 888, jiLabel);

        Paint jiContent = new Paint(Paint.ANTI_ALIAS_FLAG);
        jiContent.setTextSize(18);
        jiContent.setColor(Color.parseColor("#6E6A63"));
        String jiStr = quote.ji.length() > 22 ? quote.ji.substring(0, 21) + "…" : quote.ji;
        canvas.drawText(jiStr, 105, 888, jiContent);

        // Divider
        Paint innerLine = new Paint(Paint.ANTI_ALIAS_FLAG);
        innerLine.setColor(Color.parseColor("#1F2D2D2D"));
        innerLine.setStrokeWidth(1.2f);
        canvas.drawLine(55, 908, width - 55, 908, innerLine);

        // Row 3: Lucky Slack Time + Meeting Badge (y = 942)
        int daySeed = (month * 31 + day);
        String luckyTime = LUCKY_SLACK_TIMES[daySeed % LUCKY_SLACK_TIMES.length];
        Paint slackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        slackPaint.setTextSize(16);
        slackPaint.setColor(Color.parseColor("#785A3C"));
        canvas.drawText("摸魚吉時：" + luckyTime.split(" ")[0], 65, 942, slackPaint);

        int meetingCount = prefs.getInt("meeting_count", 0);
        Paint agendaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        agendaPaint.setTypeface(Typeface.DEFAULT_BOLD);
        agendaPaint.setTextSize(16);
        agendaPaint.setColor(Color.parseColor("#2D2D2D"));
        agendaPaint.setTextAlign(Paint.Align.RIGHT);
        if (meetingCount > 0) {
            canvas.drawText("📅 今日 " + meetingCount + " 場行程連動 ↗", width - 65, 942, agendaPaint);
        } else {
            canvas.drawText("📅 行事曆無會議・點擊查看 ↗", width - 65, 942, agendaPaint);
        }

        // Draw whole card outline border
        canvas.drawRoundRect(cardRect, 30, 30, cardBorder);
        canvas.restore();
    }

    private static void drawTopBinderClamp(Canvas canvas, String title, String rightSubtitle, int width) {
        float binderHeight = 70f;
        Paint binderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        binderPaint.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawRect(10, 16, width - 10, binderHeight, binderPaint);

        // Brass Ring Rivets (Left & Right)
        Paint rivetPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        rivetPaint.setColor(Color.parseColor("#D4B483"));
        canvas.drawCircle(55, 43, 8.5f, rivetPaint);
        canvas.drawCircle(width - 55, 43, 8.5f, rivetPaint);

        Paint ringHoleInner = new Paint(Paint.ANTI_ALIAS_FLAG);
        ringHoleInner.setColor(Color.parseColor("#80000000"));
        canvas.drawCircle(55, 43, 4.0f, ringHoleInner);
        canvas.drawCircle(width - 55, 43, 4.0f, ringHoleInner);

        // Title text
        Paint titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        titlePaint.setTypeface(Typeface.DEFAULT_BOLD);
        titlePaint.setTextSize(16);
        titlePaint.setColor(Color.parseColor("#F9F6F0"));
        canvas.drawText(title, 82, 49, titlePaint);

        // Right subtitle / character name
        Paint subPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subPaint.setTypeface(Typeface.DEFAULT_BOLD);
        subPaint.setTextSize(15);
        subPaint.setColor(Color.parseColor("#D4B483"));
        subPaint.setTextAlign(Paint.Align.RIGHT);
        canvas.drawText(rightSubtitle, width - 82, 49, subPaint);
    }

    private static void drawSawtoothEdge(Canvas canvas, float topY, int width) {
        Path path = new Path();
        path.moveTo(10, topY);
        float step = 14f;
        boolean down = true;
        for (float x = 10; x <= width - 10; x += step) {
            float y = down ? topY + 7f : topY + 1f;
            path.lineTo(x, y);
            down = !down;
        }
        path.lineTo(width - 10, topY);
        path.close();

        Paint teethPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        teethPaint.setColor(Color.parseColor("#262D2D2D"));
        canvas.drawPath(path, teethPaint);
    }

    private static void drawSurvivalSeal(Canvas canvas, float cx, float cy, boolean isSurvived, boolean isPast) {
        canvas.save();
        canvas.translate(cx, cy);
        canvas.rotate(-13f);

        float radius = 72f;

        if (isSurvived || isPast) {
            // Authentic Double-Ring Circular Red Seal
            Paint sealBg = new Paint(Paint.ANTI_ALIAS_FLAG);
            sealBg.setColor(Color.parseColor("#EBF9F6F0"));
            canvas.drawCircle(0, 0, radius, sealBg);

            Paint outerRing = new Paint(Paint.ANTI_ALIAS_FLAG);
            outerRing.setStyle(Paint.Style.STROKE);
            outerRing.setStrokeWidth(3.8f);
            outerRing.setColor(Color.parseColor("#C83E31"));
            canvas.drawCircle(0, 0, radius, outerRing);

            Paint innerDashed = new Paint(Paint.ANTI_ALIAS_FLAG);
            innerDashed.setStyle(Paint.Style.STROKE);
            innerDashed.setStrokeWidth(1.8f);
            innerDashed.setColor(Color.parseColor("#C83E31"));
            innerDashed.setPathEffect(new DashPathEffect(new float[]{6, 4}, 0));
            canvas.drawCircle(0, 0, radius - 7, innerDashed);

            Paint stampTextTop = new Paint(Paint.ANTI_ALIAS_FLAG);
            stampTextTop.setTypeface(Typeface.DEFAULT_BOLD);
            stampTextTop.setTextSize(12);
            stampTextTop.setColor(Color.parseColor("#C83E31"));
            stampTextTop.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("幹話日曆認證", 0, -32, stampTextTop);

            Paint stampTextMain = new Paint(Paint.ANTI_ALIAS_FLAG);
            stampTextMain.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            stampTextMain.setTextSize(21);
            stampTextMain.setColor(Color.parseColor("#C83E31"));
            stampTextMain.setTextAlign(Paint.Align.CENTER);
            canvas.drawText(isPast ? "歷史存檔" : "今日已生還", 0, -3, stampTextMain);

            Paint stampTextSub = new Paint(Paint.ANTI_ALIAS_FLAG);
            stampTextSub.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            stampTextSub.setTextSize(16);
            stampTextSub.setColor(Color.parseColor("#C83E31"));
            stampTextSub.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("平安下班", 0, 20, stampTextSub);

            Paint stampTextBottom = new Paint(Paint.ANTI_ALIAS_FLAG);
            stampTextBottom.setTypeface(Typeface.DEFAULT_BOLD);
            stampTextBottom.setTextSize(11);
            stampTextBottom.setColor(Color.parseColor("#C83E31"));
            stampTextBottom.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("★ SURVIVED ★", 0, 42, stampTextBottom);
        } else {
            // Soft Invitation to Stamp Placeholder
            Paint placeholderRing = new Paint(Paint.ANTI_ALIAS_FLAG);
            placeholderRing.setStyle(Paint.Style.STROKE);
            placeholderRing.setStrokeWidth(2.0f);
            placeholderRing.setColor(Color.parseColor("#80C83E31"));
            placeholderRing.setPathEffect(new DashPathEffect(new float[]{7, 5}, 0));
            canvas.drawCircle(0, 0, radius - 4, placeholderRing);

            Paint pText = new Paint(Paint.ANTI_ALIAS_FLAG);
            pText.setTypeface(Typeface.DEFAULT_BOLD);
            pText.setTextSize(17);
            pText.setColor(Color.parseColor("#C83E31"));
            pText.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("點擊蓋章", 0, -6, pText);
            canvas.drawText("今日生還", 0, 18, pText);

            Paint subPText = new Paint(Paint.ANTI_ALIAS_FLAG);
            subPText.setTextSize(11);
            subPText.setColor(Color.parseColor("#785A3C"));
            subPText.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("STAMP 💮", 0, 38, subPText);
        }

        canvas.restore();
    }

    private static Bitmap getSpriteCellBitmap(Context context, String spriteSheet, String spritePosition, String characterKey) {
        if (spriteSheet == null || spriteSheet.isEmpty()) {
            return getFallbackAvatar(context, characterKey);
        }

        try {
            Bitmap sheetBitmap;
            synchronized (sSheetBitmaps) {
                sheetBitmap = sSheetBitmaps.get(spriteSheet);
                if (sheetBitmap == null || sheetBitmap.isRecycled()) {
                    String assetRelative = "public" + spriteSheet;
                    if (assetRelative.startsWith("/")) assetRelative = assetRelative.substring(1);
                    InputStream is = context.getAssets().open(assetRelative);
                    sheetBitmap = BitmapFactory.decodeStream(is);
                    is.close();
                    if (sheetBitmap != null) {
                        sSheetBitmaps.put(spriteSheet, sheetBitmap);
                    }
                }
            }

            if (sheetBitmap == null) {
                return getFallbackAvatar(context, characterKey);
            }

            String pos = spritePosition != null ? spritePosition.trim() : "0% 0%";
            String[] parts = pos.split("\\s+");
            float posX = 0f;
            float posY = 0f;
            try {
                posX = Float.parseFloat(parts[0].replace("%", ""));
                if (parts.length > 1) {
                    posY = Float.parseFloat(parts[1].replace("%", ""));
                }
            } catch (Exception ignored) {}

            int col = posX >= 75 ? 2 : (posX >= 25 ? 1 : 0);
            int row = posY >= 75 ? 2 : (posY >= 25 ? 1 : 0);

            int cellW = sheetBitmap.getWidth() / 3;
            int cellH = sheetBitmap.getHeight() / 3;

            Rect srcRect = new Rect(col * cellW, row * cellH, (col + 1) * cellW, (row + 1) * cellH);
            Bitmap cropped = Bitmap.createBitmap(sheetBitmap, srcRect.left, srcRect.top, cellW, cellH);
            return cropped;
        } catch (Exception e) {
            e.printStackTrace();
            return getFallbackAvatar(context, characterKey);
        }
    }

    private static Bitmap getFallbackAvatar(Context context, String characterKey) {
        int resId = R.drawable.widget_char_cat;
        if ("capybara".equals(characterKey)) resId = R.drawable.widget_char_capybara;
        else if ("ghost".equals(characterKey)) resId = R.drawable.widget_char_ghost;
        return BitmapFactory.decodeResource(context.getResources(), resId);
    }

    private static Bitmap getRoundedBitmap(Bitmap src, float radius) {
        if (src == null) return null;
        Bitmap output = Bitmap.createBitmap(src.getWidth(), src.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Rect rect = new Rect(0, 0, src.getWidth(), src.getHeight());
        RectF rectF = new RectF(rect);
        canvas.drawRoundRect(rectF, radius, radius, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(src, rect, rect, paint);
        return output;
    }

    private static DeskDayQuote getQuoteForDate(Context context, String ymd) {
        ensureQuotesLoaded(context);
        String dateKey = "01-01";
        int month = 1;
        int day = 1;
        try {
            String[] parts = ymd.split("-");
            if (parts.length >= 3) {
                month = Integer.parseInt(parts[1]);
                day = Integer.parseInt(parts[2]);
                dateKey = String.format(Locale.US, "%02d-%02d", month, day);
            }
        } catch (Exception ignored) {}

        if (sQuotesCache != null && sQuotesCache.containsKey(dateKey)) {
            return sQuotesCache.get(dateKey);
        }

        // Fallback default quote
        DeskDayQuote fallback = new DeskDayQuote();
        fallback.month = month;
        fallback.day = day;
        fallback.dateKey = dateKey;
        fallback.quote = "週五下午四點後開會的人，靈魂注定得不到安息。";
        fallback.subtext = "只要我夠努力，老闆明年就能換最新款保時捷了。";
        fallback.character = "cat";
        fallback.spriteSheet = "/assets/sheets/cat_sheet_2.jpg";
        fallback.spritePosition = "100% 50%";
        fallback.yi = YI_SAMPLES[0];
        fallback.ji = JI_SAMPLES[0];
        return fallback;
    }

    private static synchronized void ensureQuotesLoaded(Context context) {
        if (sQuotesCache != null) return;
        sQuotesCache = new HashMap<>();

        try {
            InputStream is = context.getAssets().open("public/quotes365.json");
            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();

            JSONArray array = new JSONArray(sb.toString());
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                DeskDayQuote q = new DeskDayQuote();
                q.month = obj.optInt("month", 1);
                q.day = obj.optInt("day", 1);
                q.dateKey = obj.optString("dateKey", String.format(Locale.US, "%02d-%02d", q.month, q.day));
                q.quote = obj.optString("quote", "每日一頁社畜生存指南");
                q.subtext = obj.optString("subtext", "撕掉今天的厭世");
                q.character = obj.optString("character", "cat");
                q.spriteSheet = obj.optString("spriteSheet", "/assets/sheets/cat_sheet.jpg");
                q.spritePosition = obj.optString("spritePosition", "0% 0%");

                int seed = (q.month * 31 + q.day);
                q.yi = YI_SAMPLES[seed % YI_SAMPLES.length];
                q.ji = JI_SAMPLES[(seed + 3) % JI_SAMPLES.length];

                sQuotesCache.put(q.dateKey, q);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String getLunarDescription(int gYear, int gMonth0, int gDay) {
        try {
            android.icu.util.ChineseCalendar cc = new android.icu.util.ChineseCalendar();
            Calendar gc = Calendar.getInstance();
            gc.set(gYear, gMonth0, gDay);
            cc.setTimeInMillis(gc.getTimeInMillis());

            int lMonth = cc.get(android.icu.util.ChineseCalendar.MONTH) + 1;
            int lDay = cc.get(android.icu.util.ChineseCalendar.DAY_OF_MONTH);

            String monthStr = (lMonth >= 1 && lMonth <= 12) ? CHINESE_MONTH_NAMES[lMonth - 1] : lMonth + "月";
            String dayStr = (lDay >= 1 && lDay <= 30) ? CHINESE_LUNAR_DAYS[lDay] : String.valueOf(lDay);

            return monthStr + dayStr;
        } catch (Throwable ignored) {}

        return "初一";
    }

    private static String getCharacterBadge(String charKey) {
        if ("capybara".equals(charKey)) return "🦫 佛系水豚";
        if ("ghost".equals(charKey)) return "👻 能量幽靈";
        return "🐱 厭世社畜貓";
    }

    private static void playTearSound(Context context) {
        try {
            AssetFileDescriptor afd = context.getAssets().openFd("public/assets/sounds/paper_tear_perforated.wav");
            MediaPlayer mp = new MediaPlayer();
            mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            mp.setVolume(1.0f, 1.0f);
            mp.setOnCompletionListener(MediaPlayer::release);
            mp.setOnErrorListener((mp1, what, extra) -> {
                try { mp1.release(); } catch (Exception ignored) {}
                return true;
            });
            mp.prepare();
            mp.start();
        } catch (Exception e) {
            try {
                AssetFileDescriptor afd2 = context.getAssets().openFd("public/assets/sounds/paper_tear_crisp.wav");
                MediaPlayer mp2 = new MediaPlayer();
                mp2.setDataSource(afd2.getFileDescriptor(), afd2.getStartOffset(), afd2.getLength());
                afd2.close();
                mp2.setVolume(1.0f, 1.0f);
                mp2.setOnCompletionListener(MediaPlayer::release);
                mp2.prepare();
                mp2.start();
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    private static void vibratePerforation(Context context) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 15, 20, 20, 25, 45};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {}
    }

    private static void vibrateStamp(Context context) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 40, 60, 80};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {}
    }

    private static void vibrateLocked(Context context) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 25, 35, 25};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception ignored) {}
    }

    private static void vibrateTick(Context context, long ms) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(ms);
                }
            }
        } catch (Exception ignored) {}
    }
}
