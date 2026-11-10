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
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
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
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 4x5 Tall Slender Tear-Off Daily Desk Calendar Widget (App-Icon Styled)
 * Features 3D Brass Rings, Charcoal Header, Hand-drawn Jagged Tear Strip,
 * Hero Red 2-Digit Date, Frameless Character, Overlapping Stamp,
 * and 4 Stacked Bottom Paper Layers with Bottom-Right Page Curl.
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
        "準時關機人際關係",
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
        "認真打開銀行帳戶看存款餘額",
        "在週五下午四點答應「順便開個會」",
        "相信共體時艱與明年調薪大餅",
        "在下班前五分鐘主動問「還有事嗎」",
        "接聽沒有事先傳訊息預告的電話",
        "在週五下午五點進行正式環境部署",
        "睡前滑手機不小心點開公司群組",
        "相信「這場會只要十分鐘就結束」"
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
            if (savedDate.compareTo(todayKey) > 0) {
                return todayKey;
            }
            return savedDate;
        }

        if (isTodayUnlocked) {
            return todayKey;
        } else {
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

            // Generate crisp 800x1200 Tall Slender Desk Calendar Card Bitmap
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
        int height = 1360;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        boolean isToday = cardDate.equals(todayKey);
        boolean isPast = cardDate.compareTo(todayKey) < 0;

        // Elegant slender proportions matching 4x5 grid
        float cardLeft = 24f;
        float cardRight = 776f;
        float cardWidth = cardRight - cardLeft;

        if (isPeeling && isPast) {
            // STEP A: 2-Frame Peel Animation
            // Draw Next Day's card underneath
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                Calendar c = Calendar.getInstance();
                c.setTime(sdf.parse(cardDate));
                c.add(Calendar.DAY_OF_MONTH, 1);
                String nextDate = sdf.format(c.getTime());

                drawTallDeskCalendarCard(canvas, context, prefs, nextDate, todayKey, false, cardLeft, cardRight, width, height);
            } catch (Exception ignored) {}

            // Draw current peeled page tilted at -12deg peeling down and left
            canvas.save();
            canvas.translate(-35f, 75f);
            canvas.rotate(-12f, 400f, 250f);

            Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            shadowPaint.setColor(Color.parseColor("#44000000"));
            RectF peelShadowRect = new RectF(cardLeft, 220f, cardRight, 1170f);
            canvas.drawRoundRect(peelShadowRect, 24f, 24f, shadowPaint);

            drawTallDeskCalendarCard(canvas, context, prefs, cardDate, todayKey, true, cardLeft, cardRight, width, height);
            canvas.restore();

            // Re-draw the fixed top black binder clamp and brass rings on top
            drawTopCharcoalHeader(canvas, cardLeft, cardRight, 75f, 215f);
            drawBrassRings(canvas, cardLeft, cardWidth, 22f, 150f);
        } else {
            // Regular crisp desk calendar view
            drawTallDeskCalendarCard(canvas, context, prefs, cardDate, todayKey, false, cardLeft, cardRight, width, height);
        }

        return bitmap;
    }

    private static void drawTallDeskCalendarCard(
            Canvas canvas, Context context, SharedPreferences prefs,
            String cardDate, String todayKey, boolean isDetachedPeel,
            float cardLeft, float cardRight, int width, int height) {

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

        String weekdayZh = CHINESE_WEEKDAYS[dayOfWeek - 1];
        String monthZh = (month >= 1 && month <= 12) ? CHINESE_MONTH_NAMES[month - 1] : month + "月";

        float cardWidth = cardRight - cardLeft;
        float headerTop = 75f;
        float headerBottom = 215f;
        float pageBottom = 1170f;

        // 1. Draw 4 Bottom 3D Stacked Paper Layers (from y = 1170 to 1290)
        if (!isDetachedPeel) {
            drawBottomStackedLayers(canvas, cardLeft, cardRight, pageBottom);
        }

        // 2. Active Page Background (#FAF7F0 Warm Vintage Cream)
        RectF pageBodyRect = new RectF(cardLeft, headerBottom - 10f, cardRight, pageBottom);
        Paint pageBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        pageBg.setColor(Color.parseColor("#FAF7F0"));
        canvas.drawRect(pageBodyRect, pageBg);

        // Active Page Ink Outline
        Paint cardOutline = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardOutline.setStyle(Paint.Style.STROKE);
        cardOutline.setStrokeWidth(3.5f);
        cardOutline.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawRect(pageBodyRect, cardOutline);

        // 3. Top Charcoal Header Block (#2D2D2D) & 3D Brass Rings
        if (!isDetachedPeel) {
            drawTopCharcoalHeader(canvas, cardLeft, cardRight, headerTop, headerBottom);
            drawBrassRings(canvas, cardLeft, cardWidth, 22f, 150f);
        }

        // 4. Perforated Tear Strip (y = 215 to 305) matching Screenshot 1 vintage stationery
        // Top Dashed Perforation Line
        Paint topDashedLine = new Paint(Paint.ANTI_ALIAS_FLAG);
        topDashedLine.setStyle(Paint.Style.STROKE);
        topDashedLine.setStrokeWidth(2.2f);
        topDashedLine.setColor(Color.parseColor("#502D2D2D"));
        topDashedLine.setPathEffect(new DashPathEffect(new float[]{8, 6}, 0));
        canvas.drawLine(cardLeft + 10f, 222f, cardRight - 10f, 222f, topDashedLine);

        // Action Text Row (Clean brackets, exactly as in Screenshot 1)
        float actionCenterY = 268f;

        // Left button: [ < 前一日 ]
        Paint prevTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        prevTextPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        prevTextPaint.setTextSize(25);
        prevTextPaint.setColor(Color.parseColor("#2D2D2D"));
        prevTextPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("[ < 前一日 ]", cardLeft + 130f, actionCenterY, prevTextPaint);

        // Center label: ✂ 點擊撕下日曆
        Paint centerLabelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        centerLabelPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        centerLabelPaint.setTextSize(22);
        centerLabelPaint.setColor(Color.parseColor("#3D3935"));
        centerLabelPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("✂ 點擊撕下日曆", width / 2f, actionCenterY, centerLabelPaint);

        // Right button: [ 撕下一頁 ↘ ] or [ 🔒 明日封印 ]
        Paint nextTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        nextTextPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        nextTextPaint.setTextSize(25);
        nextTextPaint.setTextAlign(Paint.Align.CENTER);

        if (isPast) {
            nextTextPaint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawText("[ 撕下一頁 ↘ ]", cardRight - 130f, actionCenterY, nextTextPaint);
        } else {
            nextTextPaint.setColor(Color.parseColor("#78736B"));
            canvas.drawText("[ 🔒 明日封印 ]", cardRight - 130f, actionCenterY, nextTextPaint);
        }

        // Jagged Torn Paper Edge across bottom of tear strip (y = 305)
        drawJaggedTornEdge(canvas, cardLeft, cardRight, 305f);

        // 5. Classic 3-Column Taiwanese Hero Date Layout (y = 315 to 480)
        // Left Column: 2026年 + 十一月
        Paint yearPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        yearPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        yearPaint.setTextSize(28);
        yearPaint.setColor(Color.parseColor("#2D2D2D"));
        yearPaint.setTextAlign(Paint.Align.CENTER);
        float leftColX = cardLeft + 125f;
        canvas.drawText(year + "年", leftColX, 380f, yearPaint);

        Paint monthPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        monthPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        monthPaint.setTextSize(44);
        monthPaint.setColor(Color.parseColor("#2D2D2D"));
        monthPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(monthZh, leftColX, 444f, monthPaint);

        // Center Column: Hero Vermilion Red 2-Digit Day Number (e.g. 09)
        Paint heroDayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        heroDayPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        heroDayPaint.setTextSize(150);
        heroDayPaint.setColor(Color.parseColor("#C83E31")); // Vermilion Red
        heroDayPaint.setTextAlign(Paint.Align.CENTER);
        String dayStr = String.format(Locale.US, "%02d", day);
        canvas.drawText(dayStr, width / 2f, 452f, heroDayPaint);

        // Right Column: 星期一・ + 農曆十月初一
        float rightColX = cardRight - 125f;
        Paint weekdayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        weekdayPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        weekdayPaint.setTextSize(28);
        weekdayPaint.setColor(Color.parseColor("#2D2D2D"));
        weekdayPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(weekdayZh + "・", rightColX, 380f, weekdayPaint);

        String lunarDesc = getLunarDescription(year, month - 1, day);
        Paint lunarPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        lunarPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        lunarPaint.setTextSize(26);
        lunarPaint.setColor(Color.parseColor("#2D2D2D"));
        lunarPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("農曆" + lunarDesc, rightColX, 444f, lunarPaint);

        // Solid Bold Ink Divider under Date Header
        Paint solidDivider = new Paint(Paint.ANTI_ALIAS_FLAG);
        solidDivider.setColor(Color.parseColor("#2D2D2D"));
        solidDivider.setStrokeWidth(3.5f);
        canvas.drawLine(cardLeft + 15f, 480f, cardRight - 15f, 480f, solidDivider);

        // 6. Seamless Center Character Illustration (Drawn with MULTIPLY so NO WHITE SQUARE BOX)
        float illCenterY = 650f;
        float spriteSize = 280f;
        Bitmap spriteBitmap = getSpriteCellBitmap(context, quote.spriteSheet, quote.spritePosition, quote.character);
        if (spriteBitmap != null) {
            RectF dstRect = new RectF(
                    (width - spriteSize) / 2f,
                    illCenterY - spriteSize / 2f,
                    (width + spriteSize) / 2f,
                    illCenterY + spriteSize / 2f
            );
            Paint spritePaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            spritePaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.MULTIPLY));
            canvas.drawBitmap(spriteBitmap, null, dstRect, spritePaint);
        }

        // Overlapping Tilted Red Rubber Stamp "今日已生還" (Matching Screenshot 1)
        drawTiltedSurvivalSeal(canvas, cardRight - 130f, illCenterY + 40f, isSurvived, isPast);

        // 7. Core Gàn-huà Quote & Subtext (y = 810 to 960)
        TextPaint quotePaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        quotePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        quotePaint.setTextSize(31);
        quotePaint.setColor(Color.parseColor("#2D2D2D"));

        String displayQuote = "「" + quote.quote + "」";
        StaticLayout quoteLayout = new StaticLayout(
                displayQuote,
                quotePaint,
                (int) (cardWidth - 60f),
                Layout.Alignment.ALIGN_CENTER,
                1.22f,
                0.0f,
                false
        );

        canvas.save();
        canvas.translate(cardLeft + 30f, 825f);
        quoteLayout.draw(canvas);
        canvas.restore();

        Paint subtextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subtextPaint.setTypeface(Typeface.DEFAULT_BOLD);
        subtextPaint.setTextSize(19);
        subtextPaint.setColor(Color.parseColor("#6E6A63"));
        subtextPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText(quote.subtext, width / 2f, 955f, subtextPaint);

        // 8. 社畜農民曆 Box (y = 985 to 1145)
        float almTop = 985f;
        float almBottom = 1145f;
        RectF almRect = new RectF(cardLeft + 22f, almTop, cardRight - 22f, almBottom);
        Paint almBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        almBg.setColor(Color.parseColor("#FAF7F0"));
        canvas.drawRoundRect(almRect, 20f, 20f, almBg);

        Paint almBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        almBorder.setStyle(Paint.Style.STROKE);
        almBorder.setStrokeWidth(2.5f);
        almBorder.setColor(Color.parseColor("#C83E31"));
        canvas.drawRoundRect(almRect, 20f, 20f, almBorder);

        // Pill Badge: "社畜農民曆"
        RectF badgeRect = new RectF(cardLeft + 42f, almTop - 14f, cardLeft + 180f, almTop + 16f);
        Paint badgeBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        badgeBg.setColor(Color.parseColor("#C83E31"));
        canvas.drawRoundRect(badgeRect, 15f, 15f, badgeBg);
        Paint badgeText = new Paint(Paint.ANTI_ALIAS_FLAG);
        badgeText.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        badgeText.setTextSize(16);
        badgeText.setColor(Color.WHITE);
        badgeText.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("社畜農民曆", badgeRect.centerX(), badgeRect.centerY() + 5.5f, badgeText);

        // Line 1: 宜：
        Paint yiLabel = new Paint(Paint.ANTI_ALIAS_FLAG);
        yiLabel.setTypeface(Typeface.DEFAULT_BOLD);
        yiLabel.setTextSize(20);
        yiLabel.setColor(Color.parseColor("#C83E31"));
        canvas.drawText("宜：", cardLeft + 44f, 1045f, yiLabel);

        Paint yiContent = new Paint(Paint.ANTI_ALIAS_FLAG);
        yiContent.setTypeface(Typeface.DEFAULT_BOLD);
        yiContent.setTextSize(20);
        yiContent.setColor(Color.parseColor("#2D2D2D"));
        String yiStr = quote.yi.length() > 24 ? quote.yi.substring(0, 23) + "…" : quote.yi;
        canvas.drawText(yiStr, cardLeft + 88f, 1045f, yiContent);

        // Line 2: 忌：
        Paint jiLabel = new Paint(Paint.ANTI_ALIAS_FLAG);
        jiLabel.setTypeface(Typeface.DEFAULT_BOLD);
        jiLabel.setTextSize(20);
        jiLabel.setColor(Color.parseColor("#C83E31"));
        canvas.drawText("忌：", cardLeft + 44f, 1098f, jiLabel);

        Paint jiContent = new Paint(Paint.ANTI_ALIAS_FLAG);
        jiContent.setTypeface(Typeface.DEFAULT_BOLD);
        jiContent.setTextSize(20);
        jiContent.setColor(Color.parseColor("#2D2D2D"));
        String jiStr = quote.ji.length() > 24 ? quote.ji.substring(0, 23) + "…" : quote.ji;
        canvas.drawText(jiStr, cardLeft + 88f, 1098f, jiContent);

        // 9. Curled Page Corner on Bottom-Right (Active Sheet Fold)
        if (!isDetachedPeel) {
            drawBottomRightPageCurl(canvas, cardRight, pageBottom);
        }
    }

    private static void drawTopCharcoalHeader(Canvas canvas, float left, float right, float top, float bottom) {
        Path path = new Path();
        float r = 32f;
        path.moveTo(left, bottom);
        path.lineTo(left, top + r);
        path.quadTo(left, top, left + r, top);
        path.lineTo(right - r, top);
        path.quadTo(right, top, right, top + r);
        path.lineTo(right, bottom);
        path.close();

        Paint headerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        headerPaint.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawPath(path, headerPaint);

        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(3.5f);
        borderPaint.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawPath(path, borderPaint);

        // Large Calligraphic Vintage Serif Title: 幹話日曆
        Paint titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        titlePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        titlePaint.setTextSize(52);
        titlePaint.setColor(Color.parseColor("#F9F6F0"));
        titlePaint.setTextAlign(Paint.Align.CENTER);
        titlePaint.setLetterSpacing(0.08f);
        canvas.drawText("幹話日曆", (left + right) / 2f, top + 92f, titlePaint);
    }

    private static void drawBrassRings(Canvas canvas, float cardLeft, float cardWidth, float topY, float holeY) {
        float leftRingX = cardLeft + cardWidth * 0.22f;
        float rightRingX = cardLeft + cardWidth * 0.78f;
        float[] ringXs = {leftRingX, rightRingX};

        Paint ringBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        ringBorder.setStyle(Paint.Style.STROKE);
        ringBorder.setStrokeWidth(4.5f);
        ringBorder.setColor(Color.parseColor("#2D2D2D"));

        // Brass gold metallic gradient
        Shader brassShader = new LinearGradient(
                0, topY, 0, holeY,
                new int[]{Color.parseColor("#F2DA9B"), Color.parseColor("#C7A257"), Color.parseColor("#8A6724")},
                new float[]{0f, 0.5f, 1.0f},
                Shader.TileMode.CLAMP
        );
        Paint ringFill = new Paint(Paint.ANTI_ALIAS_FLAG);
        ringFill.setShader(brassShader);

        Paint ringHolePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        ringHolePaint.setColor(Color.parseColor("#181818"));

        for (float rx : ringXs) {
            // Cutout punched hole in the charcoal header
            canvas.drawCircle(rx, holeY, 13f, ringHolePaint);

            // Ring loop body
            RectF outerLoop = new RectF(rx - 22f, topY, rx + 22f, holeY);
            canvas.drawRoundRect(outerLoop, 22f, 22f, ringFill);
            canvas.drawRoundRect(outerLoop, 22f, 22f, ringBorder);

            // Ring inner cutout
            RectF innerLoop = new RectF(rx - 9f, topY + 18f, rx + 9f, holeY - 4f);
            Paint innerClear = new Paint(Paint.ANTI_ALIAS_FLAG);
            innerClear.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawRoundRect(innerLoop, 9f, 9f, innerClear);
            canvas.drawRoundRect(innerLoop, 9f, 9f, ringBorder);
        }
    }

    private static void drawJaggedTornEdge(Canvas canvas, float left, float right, float baseY) {
        Path jaggedPath = new Path();
        jaggedPath.moveTo(left, baseY - 2f);

        float[] waveDeltas = {3f, 8f, 2f, 9f, 4f, 11f, 3f, 8f, 2f, 10f, 4f, 7f, 3f, 9f, 2f, 8f, 3f, 10f};
        float curX = left;
        int idx = 0;
        float step = (right - left) / waveDeltas.length;

        for (float delta : waveDeltas) {
            float nextX = curX + step;
            float midX = (curX + nextX) / 2f;
            jaggedPath.lineTo(midX, baseY + delta);
            jaggedPath.lineTo(nextX, baseY + 1f);
            curX = nextX;
        }

        jaggedPath.lineTo(right, baseY - 2f);
        jaggedPath.close();

        Paint tornFill = new Paint(Paint.ANTI_ALIAS_FLAG);
        tornFill.setColor(Color.parseColor("#FAF7F0"));
        canvas.drawPath(jaggedPath, tornFill);

        Paint tornLine = new Paint(Paint.ANTI_ALIAS_FLAG);
        tornLine.setStyle(Paint.Style.STROKE);
        tornLine.setStrokeWidth(2.5f);
        tornLine.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawPath(jaggedPath, tornLine);
    }

    private static void drawBottomStackedLayers(Canvas canvas, float left, float right, float pageBottom) {
        float[] layerYOffsets = {24f, 46f, 68f, 92f};
        Paint layerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        layerPaint.setColor(Color.parseColor("#F5EFE4"));

        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(2.8f);
        borderPaint.setColor(Color.parseColor("#2D2D2D"));

        // Draw 4 curved paper bottom edges
        for (int i = layerYOffsets.length - 1; i >= 0; i--) {
            float bottomY = pageBottom + layerYOffsets[i];
            float inset = (layerYOffsets.length - 1 - i) * 1.5f;

            Path layerPath = new Path();
            layerPath.moveTo(left + inset, pageBottom - 20f);
            layerPath.lineTo(left + inset, bottomY - 18f);
            layerPath.quadTo(left + inset, bottomY, left + inset + 22f, bottomY);
            layerPath.lineTo(right - inset - 22f, bottomY);
            layerPath.quadTo(right - inset, bottomY, right - inset, bottomY - 18f);
            layerPath.lineTo(right - inset, pageBottom - 20f);
            layerPath.close();

            canvas.drawPath(layerPath, layerPaint);
            canvas.drawPath(layerPath, borderPaint);
        }
    }

    private static void drawBottomRightPageCurl(Canvas canvas, float cardRight, float pageBottom) {
        float curlWidth = 90f;
        float curlHeight = 78f;

        // Shadow under curl
        Path shadowPath = new Path();
        shadowPath.moveTo(cardRight - curlWidth - 8f, pageBottom);
        shadowPath.lineTo(cardRight, pageBottom - curlHeight - 8f);
        shadowPath.lineTo(cardRight - curlWidth / 2f, pageBottom - curlHeight / 2f);
        shadowPath.close();

        Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shadowPaint.setColor(Color.parseColor("#38000000"));
        canvas.drawPath(shadowPath, shadowPaint);

        // Folded Upward Triangular Flap
        Path foldPath = new Path();
        foldPath.moveTo(cardRight - curlWidth, pageBottom);
        foldPath.lineTo(cardRight, pageBottom - curlHeight);
        foldPath.lineTo(cardRight - curlWidth + 14f, pageBottom - curlHeight + 14f);
        foldPath.close();

        Paint foldFill = new Paint(Paint.ANTI_ALIAS_FLAG);
        foldFill.setColor(Color.parseColor("#EAE1D1"));
        canvas.drawPath(foldPath, foldFill);

        Paint foldBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        foldBorder.setStyle(Paint.Style.STROKE);
        foldBorder.setStrokeWidth(2.5f);
        foldBorder.setColor(Color.parseColor("#2D2D2D"));
        canvas.drawPath(foldPath, foldBorder);
    }

    private static void drawTiltedSurvivalSeal(Canvas canvas, float cx, float cy, boolean isSurvived, boolean isPast) {
        canvas.save();
        canvas.translate(cx, cy);
        canvas.rotate(-10f);

        // Rectangular authentic Taiwanese red rubber stamp with double border matching Screenshot 1
        float w = 150f;
        float h = 64f;
        RectF outerRect = new RectF(-w / 2f, -h / 2f, w / 2f, h / 2f);
        RectF innerRect = new RectF(-w / 2f + 4f, -h / 2f + 4f, w / 2f - 4f, h / 2f - 4f);

        Paint stampBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        stampBorder.setStyle(Paint.Style.STROKE);
        stampBorder.setColor(Color.parseColor("#C83E31"));
        stampBorder.setStrokeWidth(2.8f);
        canvas.drawRoundRect(outerRect, 10f, 10f, stampBorder);

        stampBorder.setStrokeWidth(1.4f);
        canvas.drawRoundRect(innerRect, 7f, 7f, stampBorder);

        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        textPaint.setTextSize(26);
        textPaint.setColor(Color.parseColor("#C83E31"));
        textPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("今日已生還", 0, 9f, textPaint);

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
        fallback.quote = "當有人在辦公室大聲講電話，我會在心裡幫他伴奏一首《大悲咒》。";
        fallback.subtext = "願世界和平，顯噪音退散";
        fallback.character = "ghost";
        fallback.spriteSheet = "/assets/sheets/ghost_sheet.jpg";
        fallback.spritePosition = "50% 50%";
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

        return "十月初一";
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
