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
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.widget.RemoteViews;
import java.io.File;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class MonthlyLargeWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_WIDGET_PREV_MONTH = "com.ganhuacalendar.app.ACTION_WIDGET_PREV_MONTH";
    public static final String ACTION_WIDGET_NEXT_MONTH = "com.ganhuacalendar.app.ACTION_WIDGET_NEXT_MONTH";
    public static final String ACTION_WIDGET_TODAY = "com.ganhuacalendar.app.ACTION_WIDGET_TODAY";
    public static final String ACTION_WIDGET_SELECT_DATE = "com.ganhuacalendar.app.ACTION_WIDGET_SELECT_DATE";
    public static final String EXTRA_DATE_KEY = "date_key";

    // Legacy backwards compatibility
    public static final String ACTION_SELECT_LARGE_DATE = "com.ganhuacalendar.app.ACTION_SELECT_LARGE_DATE";
    public static final String ACTION_RESET_LARGE_TODAY = "com.ganhuacalendar.app.ACTION_RESET_LARGE_TODAY";

    private static final String[] CHINESE_LUNAR_DAYS = {
        "",
        "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
        "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
    };

    private static final int[] CELL_IDS = {
        R.id.cell_0, R.id.cell_1, R.id.cell_2, R.id.cell_3, R.id.cell_4, R.id.cell_5, R.id.cell_6,
        R.id.cell_7, R.id.cell_8, R.id.cell_9, R.id.cell_10, R.id.cell_11, R.id.cell_12, R.id.cell_13,
        R.id.cell_14, R.id.cell_15, R.id.cell_16, R.id.cell_17, R.id.cell_18, R.id.cell_19, R.id.cell_20,
        R.id.cell_21, R.id.cell_22, R.id.cell_23, R.id.cell_24, R.id.cell_25, R.id.cell_26, R.id.cell_27,
        R.id.cell_28, R.id.cell_29, R.id.cell_30, R.id.cell_31, R.id.cell_32, R.id.cell_33, R.id.cell_34,
        R.id.cell_35, R.id.cell_36, R.id.cell_37, R.id.cell_38, R.id.cell_39, R.id.cell_40, R.id.cell_41
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        Calendar todayCal = Calendar.getInstance();
        int currentYear = todayCal.get(Calendar.YEAR);
        int currentMonth = todayCal.get(Calendar.MONTH);
        String todayYmd = String.format(Locale.US, "%04d-%02d-%02d",
                currentYear, currentMonth + 1, todayCal.get(Calendar.DAY_OF_MONTH));

        int viewYear = prefs.getInt("widget_view_year", currentYear);
        int viewMonth = prefs.getInt("widget_view_month", currentMonth);

        if (ACTION_WIDGET_PREV_MONTH.equals(action)) {
            viewMonth--;
            if (viewMonth < 0) {
                viewMonth = 11;
                viewYear--;
            }
            String newDate = String.format(Locale.US, "%04d-%02d-01", viewYear, viewMonth + 1);
            prefs.edit()
                    .putInt("widget_view_year", viewYear)
                    .putInt("widget_view_month", viewMonth)
                    .putString("widget_selected_date", newDate)
                    .apply();
            updateAllWidgets(context);
        } else if (ACTION_WIDGET_NEXT_MONTH.equals(action)) {
            viewMonth++;
            if (viewMonth > 11) {
                viewMonth = 0;
                viewYear++;
            }
            String newDate = String.format(Locale.US, "%04d-%02d-01", viewYear, viewMonth + 1);
            prefs.edit()
                    .putInt("widget_view_year", viewYear)
                    .putInt("widget_view_month", viewMonth)
                    .putString("widget_selected_date", newDate)
                    .apply();
            updateAllWidgets(context);
        } else if (ACTION_WIDGET_TODAY.equals(action) || ACTION_RESET_LARGE_TODAY.equals(action)) {
            prefs.edit()
                    .putInt("widget_view_year", currentYear)
                    .putInt("widget_view_month", currentMonth)
                    .putString("widget_selected_date", todayYmd)
                    .apply();
            updateAllWidgets(context);
        } else if (ACTION_WIDGET_SELECT_DATE.equals(action)) {
            String dateKey = intent.getStringExtra(EXTRA_DATE_KEY);
            if (dateKey != null && !dateKey.isEmpty()) {
                try {
                    String[] parts = dateKey.split("-");
                    if (parts.length == 3) {
                        int y = Integer.parseInt(parts[0]);
                        int m = Integer.parseInt(parts[1]) - 1;
                        prefs.edit()
                                .putInt("widget_view_year", y)
                                .putInt("widget_view_month", m)
                                .putString("widget_selected_date", dateKey)
                                .apply();
                        updateAllWidgets(context);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, MonthlyLargeWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int widgetId : allWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);

            Calendar todayCal = Calendar.getInstance();
            int todayYear = todayCal.get(Calendar.YEAR);
            int todayMonth = todayCal.get(Calendar.MONTH);
            int todayDay = todayCal.get(Calendar.DAY_OF_MONTH);
            String todayYmd = String.format(Locale.US, "%04d-%02d-%02d",
                    todayYear, todayMonth + 1, todayDay);

            int viewYear = prefs.getInt("widget_view_year", todayYear);
            int viewMonth = prefs.getInt("widget_view_month", todayMonth);
            String selectedDate = prefs.getString("widget_selected_date", todayYmd);

            boolean isSelectedToday = todayYmd.equals(selectedDate);
            boolean isSelectedFuture = selectedDate.compareTo(todayYmd) > 0;

            // Selected date components
            int selYear = viewYear;
            int selMonth = viewMonth;
            int selDay = todayDay;
            try {
                String[] parts = selectedDate.split("-");
                if (parts.length == 3) {
                    selYear = Integer.parseInt(parts[0]);
                    selMonth = Integer.parseInt(parts[1]) - 1;
                    selDay = Integer.parseInt(parts[2]);
                }
            } catch (Exception ignored) {}

            Calendar viewCal = Calendar.getInstance();
            viewCal.set(viewYear, viewMonth, 1);
            String monthEn = viewCal.getDisplayName(Calendar.MONTH, Calendar.SHORT, Locale.ENGLISH).toUpperCase();

            String quoteStr = prefs.getString("quote_str", "今天行事曆一片淨土，適合安靜當個薪水小偷。");
            String fullLunarStr = prefs.getString("full_lunar_str", "農曆九月廿二・霜降");
            String yiStr = prefs.getString("yi_str", "帶薪上廁所・安靜地當一塊沒用的爛泥");
            int meetingCount = prefs.getInt("meeting_count", 0);
            String characterKey = prefs.getString("character_key", "cat");
            String survivedJson = prefs.getString("survived_dates_json", "[]");
            String eventsJson = prefs.getString("events_json", "[]");

            // Render high-DPI Bitmap Canvas for 4x4 large full-month card
            int width = 800;
            int height = 800;
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            // Clip entire canvas to rounded rectangle
            Path cardPath = new Path();
            RectF cardRect = new RectF(4, 4, width - 4, height - 4);
            cardPath.addRoundRect(cardRect, 36, 36, Path.Direction.CW);
            canvas.clipPath(cardPath);

            // Background base (#F9F6F0 cream)
            Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            bgPaint.setColor(Color.parseColor("#FAF7F0"));
            canvas.drawRect(cardRect, bgPaint);

            // 1. Top Header Bar (height = 82px, #2D2D2D charcoal)
            float headerHeight = 82;
            Paint topBarPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            topBarPaint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawRect(0, 0, width, headerHeight, topBarPaint);

            // Left: Rivet dot + Year/Month
            Paint rivetPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            rivetPaint.setColor(Color.parseColor("#D4B483"));
            canvas.drawCircle(32, headerHeight / 2, 6.5f, rivetPaint);

            Paint headerTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            headerTextPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            headerTextPaint.setTextSize(25);
            headerTextPaint.setColor(Color.parseColor("#F9F6F0"));
            canvas.drawText(viewYear + "年 " + (viewMonth + 1) + "月 " + monthEn, 52, 51, headerTextPaint);

            // Right: Month switcher interactive button graphics (<  今日  >)
            // Prev button '<' (centered in overlay weight 480..580)
            RectF prevBtnBox = new RectF(505, 20, 565, 62);
            Paint switchBtnBg = new Paint(Paint.ANTI_ALIAS_FLAG);
            switchBtnBg.setColor(Color.parseColor("#3D3A36"));
            canvas.drawRoundRect(prevBtnBox, 14, 14, switchBtnBg);

            Paint switchBtnBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
            switchBtnBorder.setStyle(Paint.Style.STROKE);
            switchBtnBorder.setStrokeWidth(1.5f);
            switchBtnBorder.setColor(Color.parseColor("#6E6A63"));
            canvas.drawRoundRect(prevBtnBox, 14, 14, switchBtnBorder);

            Paint switchBtnText = new Paint(Paint.ANTI_ALIAS_FLAG);
            switchBtnText.setTypeface(Typeface.DEFAULT_BOLD);
            switchBtnText.setTextSize(22);
            switchBtnText.setColor(Color.parseColor("#F9F6F0"));
            switchBtnText.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("‹", prevBtnBox.centerX(), 49, switchBtnText);

            // Today button '今日' (centered in overlay weight 580..700)
            RectF todayBtnBox = new RectF(595, 20, 685, 62);
            Paint todayBtnPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            if (isSelectedToday && viewYear == todayYear && viewMonth == todayMonth) {
                todayBtnPaint.setColor(Color.parseColor("#3D3A36"));
                canvas.drawRoundRect(todayBtnBox, 14, 14, todayBtnPaint);
                Paint goldRing = new Paint(Paint.ANTI_ALIAS_FLAG);
                goldRing.setStyle(Paint.Style.STROKE);
                goldRing.setStrokeWidth(1.8f);
                goldRing.setColor(Color.parseColor("#D4B483"));
                canvas.drawRoundRect(todayBtnBox, 14, 14, goldRing);

                Paint todayTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                todayTextPaint.setTypeface(Typeface.DEFAULT_BOLD);
                todayTextPaint.setTextSize(17);
                todayTextPaint.setColor(Color.parseColor("#D4B483"));
                todayTextPaint.setTextAlign(Paint.Align.CENTER);
                canvas.drawText("今日", todayBtnBox.centerX(), 48, todayTextPaint);
            } else {
                todayBtnPaint.setColor(Color.parseColor("#D4B483"));
                canvas.drawRoundRect(todayBtnBox, 14, 14, todayBtnPaint);

                Paint todayTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                todayTextPaint.setTypeface(Typeface.DEFAULT_BOLD);
                todayTextPaint.setTextSize(17);
                todayTextPaint.setColor(Color.parseColor("#2D2D2D"));
                todayTextPaint.setTextAlign(Paint.Align.CENTER);
                canvas.drawText("今日", todayBtnBox.centerX(), 48, todayTextPaint);
            }

            // Next button '>' (centered in overlay weight 700..800)
            RectF nextBtnBox = new RectF(715, 20, 775, 62);
            canvas.drawRoundRect(nextBtnBox, 14, 14, switchBtnBg);
            canvas.drawRoundRect(nextBtnBox, 14, 14, switchBtnBorder);
            canvas.drawText("›", nextBtnBox.centerX(), 49, switchBtnText);

            // 2. Weekday Header Row (y = 82 to 140)
            float gridMargin = 20;
            float gridWidth = width - gridMargin * 2;
            float colWidth = gridWidth / 7.0f;
            float weekHeaderY = 118;

            String[] weekHeaders = {"日", "一", "二", "三", "四", "五", "六"};
            Paint weekPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            weekPaint.setTextSize(17);
            weekPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            weekPaint.setTextAlign(Paint.Align.CENTER);

            for (int i = 0; i < 7; i++) {
                if (i == 0) weekPaint.setColor(Color.parseColor("#C83E31"));
                else if (i == 6) weekPaint.setColor(Color.parseColor("#6E6A63"));
                else weekPaint.setColor(Color.parseColor("#2D2D2D"));
                canvas.drawText(weekHeaders[i], gridMargin + i * colWidth + colWidth / 2, weekHeaderY, weekPaint);
            }

            Paint dividerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            dividerPaint.setColor(Color.parseColor("#262D2D2D"));
            dividerPaint.setStrokeWidth(1.5f);
            canvas.drawLine(gridMargin, 138, width - gridMargin, 138, dividerPaint);

            // 3. 6-Row 42-Cell Month Matrix Calculation
            Calendar monthCal = Calendar.getInstance();
            monthCal.set(viewYear, viewMonth, 1);
            int startDayOfWeek = monthCal.get(Calendar.DAY_OF_WEEK); // 1 = Sun, 7 = Sat
            int daysInCurrentMonth = monthCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            monthCal.add(Calendar.MONTH, -1);
            int daysInPrevMonth = monthCal.getActualMaximum(Calendar.DAY_OF_MONTH);
            int prevMonth = monthCal.get(Calendar.MONTH);
            int prevYear = monthCal.get(Calendar.YEAR);

            monthCal.add(Calendar.MONTH, 2);
            int nextMonth = monthCal.get(Calendar.MONTH);
            int nextYear = monthCal.get(Calendar.YEAR);

            Paint numPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            numPaint.setTextAlign(Paint.Align.CENTER);

            Paint lunarSubPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            lunarSubPaint.setTextAlign(Paint.Align.CENTER);
            lunarSubPaint.setTextSize(12);

            float rowHeight = 68;
            float gridStartY = 140;

            String[] cellYmds = new String[42];

            for (int r = 0; r < 6; r++) {
                for (int c = 0; c < 7; c++) {
                    int cellIndex = r * 7 + c;
                    float cx = gridMargin + c * colWidth + colWidth / 2;
                    float cy = gridStartY + r * rowHeight;

                    int cellYear;
                    int cellMonth;
                    int cellDay;
                    boolean isCurrentMonth;

                    if (cellIndex < startDayOfWeek - 1) {
                        cellDay = daysInPrevMonth - (startDayOfWeek - 2 - cellIndex);
                        cellYear = prevYear;
                        cellMonth = prevMonth;
                        isCurrentMonth = false;
                    } else if ((cellIndex - (startDayOfWeek - 1)) < daysInCurrentMonth) {
                        cellDay = (cellIndex - (startDayOfWeek - 1)) + 1;
                        cellYear = viewYear;
                        cellMonth = viewMonth;
                        isCurrentMonth = true;
                    } else {
                        cellDay = (cellIndex - (startDayOfWeek - 1) - daysInCurrentMonth) + 1;
                        cellYear = nextYear;
                        cellMonth = nextMonth;
                        isCurrentMonth = false;
                    }

                    String cellYmd = String.format(Locale.US, "%04d-%02d-%02d", cellYear, cellMonth + 1, cellDay);
                    cellYmds[cellIndex] = cellYmd;

                    boolean isToday = cellYmd.equals(todayYmd);
                    boolean isSelected = cellYmd.equals(selectedDate);
                    boolean hasSurvived = survivedJson.contains(cellYmd);
                    boolean hasEvents = hasEventsForDate(eventsJson, cellYmd);

                    if (isSelected) {
                        // Dark highlight box for selected cell
                        RectF selectBox = new RectF(cx - 28, cy + 2, cx + 28, cy + 62);
                        Paint selectBoxPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                        selectBoxPaint.setColor(Color.parseColor("#2D2D2D"));
                        canvas.drawRoundRect(selectBox, 13, 13, selectBoxPaint);

                        if (isToday) {
                            Paint ringPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                            ringPaint.setStyle(Paint.Style.STROKE);
                            ringPaint.setStrokeWidth(2.5f);
                            ringPaint.setColor(Color.parseColor("#D4B483"));
                            canvas.drawRoundRect(selectBox, 13, 13, ringPaint);
                        }

                        numPaint.setColor(Color.WHITE);
                        numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                        numPaint.setTextSize(22);
                        canvas.drawText(String.valueOf(cellDay), cx, cy + 26, numPaint);

                        lunarSubPaint.setColor(Color.parseColor("#D4B483"));
                        lunarSubPaint.setTypeface(Typeface.DEFAULT_BOLD);
                        String subLabel = isToday ? "今日" : getLunarDayName(cellYear, cellMonth, cellDay);
                        canvas.drawText(subLabel, cx, cy + 47, lunarSubPaint);

                        if (hasEvents) {
                            Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                            dotPaint.setColor(Color.parseColor("#C83E31"));
                            canvas.drawCircle(cx, cy + 56, 3.0f, dotPaint);
                        }
                    } else {
                        if (isToday) {
                            // Gold ring around today when not selected
                            RectF todayBorder = new RectF(cx - 27, cy + 3, cx + 27, cy + 61);
                            Paint tBorderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                            tBorderPaint.setStyle(Paint.Style.STROKE);
                            tBorderPaint.setStrokeWidth(2.0f);
                            tBorderPaint.setColor(Color.parseColor("#D4B483"));
                            canvas.drawRoundRect(todayBorder, 12, 12, tBorderPaint);
                        }

                        if (!isCurrentMonth) {
                            numPaint.setColor(Color.parseColor("#C5BEB3"));
                            numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.NORMAL));
                        } else if (c == 0) {
                            numPaint.setColor(Color.parseColor("#C83E31")); // Sunday
                            numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                        } else {
                            numPaint.setColor(Color.parseColor("#2D2D2D"));
                            numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                        }
                        numPaint.setTextSize(21);
                        canvas.drawText(String.valueOf(cellDay), cx, cy + 26, numPaint);

                        // Lunar sub-tag using correct traditional Chinese numerals & exact holidays
                        String lunarTag = getLunarDayName(cellYear, cellMonth, cellDay);

                        if (!isCurrentMonth) {
                            lunarSubPaint.setColor(Color.parseColor("#C5BEB3"));
                            lunarSubPaint.setTypeface(Typeface.DEFAULT);
                        } else if ("國慶".equals(lunarTag) || "霜降".equals(lunarTag) || "春節".equals(lunarTag) ||
                                "端午".equals(lunarTag) || "中秋".equals(lunarTag) || "初一".equals(lunarTag)) {
                            lunarSubPaint.setColor(Color.parseColor("#C83E31"));
                            lunarSubPaint.setTypeface(Typeface.DEFAULT_BOLD);
                        } else {
                            lunarSubPaint.setColor(Color.parseColor("#6E6A63"));
                            lunarSubPaint.setTypeface(Typeface.DEFAULT);
                        }
                        canvas.drawText(lunarTag, cx, cy + 47, lunarSubPaint);

                        // Survived badge or meeting dot
                        if (hasSurvived && isCurrentMonth && cellYmd.compareTo(todayYmd) < 0) {
                            Paint stampTagPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                            stampTagPaint.setColor(Color.parseColor("#C83E31"));
                            stampTagPaint.setTextSize(9);
                            stampTagPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                            canvas.drawText("生還", cx + 18, cy + 12, stampTagPaint);
                        } else if (hasEvents) {
                            Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                            dotPaint.setColor(Color.parseColor("#C83E31"));
                            canvas.drawCircle(cx, cy + 56, 2.5f, dotPaint);
                        }
                    }
                }
            }

            // 4. Bottom Footer Strip (y = 548 to 800)
            float footerY = 548;
            Paint footerBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            footerBgPaint.setColor(Color.parseColor("#F5F0E6"));
            canvas.drawRect(0, footerY, width, height, footerBgPaint);
            canvas.drawLine(0, footerY, width, footerY, dividerPaint);

            int avatarSize = 175;
            RectF avRect = new RectF(28, footerY + 28, 28 + avatarSize, footerY + 28 + avatarSize);

            if (isSelectedFuture) {
                // Future Date: Do NOT draw character sprite! Draw yellow/red Talisman Seal graphic instead
                drawTalismanSealBox(canvas, avRect);
            } else {
                // Character Illustration Thumbnail for Today and Past Dates
                Bitmap avatarBitmap = null;
                File avatarFile = new File(context.getFilesDir(), "widget_current_avatar.png");
                if (avatarFile.exists() && avatarFile.length() > 0) {
                    try {
                        avatarBitmap = BitmapFactory.decodeFile(avatarFile.getAbsolutePath());
                    } catch (Exception ignored) {}
                }
                if (avatarBitmap == null) {
                    int fallbackRes = R.drawable.widget_char_cat;
                    if ("capybara".equals(characterKey)) fallbackRes = R.drawable.widget_char_capybara;
                    else if ("ghost".equals(characterKey)) fallbackRes = R.drawable.widget_char_ghost;
                    avatarBitmap = BitmapFactory.decodeResource(context.getResources(), fallbackRes);
                }

                if (avatarBitmap != null) {
                    Bitmap roundedAvatar = getRoundedBitmap(avatarBitmap, avatarSize, 22);

                    Paint avatarCardBg = new Paint(Paint.ANTI_ALIAS_FLAG);
                    avatarCardBg.setColor(Color.WHITE);
                    canvas.drawRoundRect(avRect, 22, 22, avatarCardBg);

                    canvas.drawBitmap(roundedAvatar, 28, footerY + 28, null);
                    canvas.drawRoundRect(avRect, 22, 22, dividerPaint);
                }
            }

            // Quote & Info on Right of Footer
            float footerTextX = 232;
            float footerTextW = width - footerTextX - 28;

            String firstEventStr = getFirstEventDisplayForDate(eventsJson, selectedDate);

            if (isSelectedFuture) {
                // Future Date: Talisman Seal Card + Future Booked Schedule
                Paint sealPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                sealPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                sealPaint.setTextSize(22);
                sealPaint.setColor(Color.parseColor("#C83E31"));
                canvas.drawText("🔮 " + (selMonth + 1) + "/" + selDay + " 未來幹話封印中", footerTextX, footerY + 44, sealPaint);

                TextPaint futureDescPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
                futureDescPaint.setTextSize(18);
                futureDescPaint.setColor(Color.parseColor("#6E6A63"));

                String futureQuote = "「命運不可預支，未來的爛事留到明天再承受。」";
                StaticLayout futureLayout = new StaticLayout(
                        futureQuote,
                        futureDescPaint,
                        (int) footerTextW,
                        Layout.Alignment.ALIGN_NORMAL,
                        1.2f,
                        0.0f,
                        false
                );
                canvas.save();
                canvas.translate(footerTextX, footerY + 62);
                futureLayout.draw(canvas);
                canvas.restore();

                Paint eventPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                eventPaint.setTypeface(Typeface.DEFAULT_BOLD);
                eventPaint.setTextSize(18);
                eventPaint.setColor(Color.parseColor("#2D2D2D"));

                if (firstEventStr != null) {
                    String eventLine = "📅 " + firstEventStr;
                    if (eventLine.length() > 22) eventLine = eventLine.substring(0, 21) + "…";
                    canvas.drawText(eventLine, footerTextX, footerY + 165, eventPaint);
                } else {
                    canvas.drawText("📅 當日尚無行程・保持空檔放空", footerTextX, footerY + 165, eventPaint);
                }

                Paint yiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                yiPaint.setTypeface(Typeface.DEFAULT_BOLD);
                yiPaint.setTextSize(16);
                yiPaint.setColor(Color.parseColor("#C83E31"));
                canvas.drawText("宜：安靜耍廢・保持呼吸", footerTextX, footerY + 200, yiPaint);
            } else if (isSelectedToday) {
                // Today: Full Quote + Yi + Synced Schedule
                TextPaint quotePaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
                quotePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                quotePaint.setTextSize(22);
                quotePaint.setColor(Color.parseColor("#2D2D2D"));

                String displayQuote = "「" + quoteStr + "」";
                StaticLayout quoteLayout = new StaticLayout(
                        displayQuote,
                        quotePaint,
                        (int) footerTextW,
                        Layout.Alignment.ALIGN_NORMAL,
                        1.2f,
                        0.0f,
                        false
                );
                canvas.save();
                canvas.translate(footerTextX, footerY + 34);
                quoteLayout.draw(canvas);
                canvas.restore();

                Paint yiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                yiPaint.setTypeface(Typeface.DEFAULT_BOLD);
                yiPaint.setTextSize(17);
                yiPaint.setColor(Color.parseColor("#C83E31"));
                String shortYi = yiStr.length() > 16 ? yiStr.substring(0, 16) + "…" : yiStr;
                canvas.drawText("宜：" + shortYi, footerTextX, footerY + 165, yiPaint);

                Paint meetingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                meetingPaint.setTextSize(16);
                meetingPaint.setColor(Color.parseColor("#6E6A63"));

                if (firstEventStr != null) {
                    String eventLine = "📅 " + firstEventStr;
                    if (eventLine.length() > 22) eventLine = eventLine.substring(0, 21) + "…";
                    canvas.drawText(eventLine, footerTextX, footerY + 200, meetingPaint);
                } else {
                    canvas.drawText("📅 今日 " + meetingCount + " 場會議・行事曆一片淨土", footerTextX, footerY + 200, meetingPaint);
                }
            } else {
                // Past Selected Date
                Paint pastHeaderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                pastHeaderPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                pastHeaderPaint.setTextSize(22);
                pastHeaderPaint.setColor(Color.parseColor("#2D2D2D"));
                canvas.drawText("📅 " + (selMonth + 1) + "月" + selDay + "日 歷史存檔", footerTextX, footerY + 44, pastHeaderPaint);

                TextPaint descPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
                descPaint.setTextSize(18);
                descPaint.setColor(Color.parseColor("#6E6A63"));

                boolean survived = survivedJson.contains(selectedDate);
                String statusMsg = survived
                        ? "「當日已蓋章平安生還，順利度過社畜的一天。」"
                        : "「當日行程已平安生還，無殘留工作事項。」";
                StaticLayout descLayout = new StaticLayout(
                        statusMsg,
                        descPaint,
                        (int) footerTextW,
                        Layout.Alignment.ALIGN_NORMAL,
                        1.2f,
                        0.0f,
                        false
                );
                canvas.save();
                canvas.translate(footerTextX, footerY + 62);
                descLayout.draw(canvas);
                canvas.restore();

                Paint eventPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                eventPaint.setTypeface(Typeface.DEFAULT_BOLD);
                eventPaint.setTextSize(17);
                eventPaint.setColor(Color.parseColor("#2D2D2D"));

                if (firstEventStr != null) {
                    String eventLine = "📅 " + firstEventStr;
                    if (eventLine.length() > 22) eventLine = eventLine.substring(0, 21) + "…";
                    canvas.drawText(eventLine, footerTextX, footerY + 165, eventPaint);
                } else {
                    canvas.drawText("💮 歷史已生還・點擊進入查看", footerTextX, footerY + 165, eventPaint);
                }

                Paint hintPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                hintPaint.setTextSize(15);
                hintPaint.setColor(Color.parseColor("#C83E31"));
                canvas.drawText("宜：早點休息・放過自己", footerTextX, footerY + 200, hintPaint);
            }

            // Card outer stroke
            canvas.drawRoundRect(cardRect, 36, 36, dividerPaint);

            // Bind to RemoteViews
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_monthly_large);
            views.setImageViewBitmap(R.id.iv_monthly_large_canvas, bitmap);

            // 5. Connect Interactive Touch Targets
            // Header: Prev Month Button '<'
            Intent prevIntent = new Intent(context, MonthlyLargeWidgetProvider.class);
            prevIntent.setAction(ACTION_WIDGET_PREV_MONTH);
            PendingIntent piPrev = PendingIntent.getBroadcast(
                    context, 1001, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.btn_widget_prev_month, piPrev);

            // Header: Today Button '今日'
            Intent todayIntent = new Intent(context, MonthlyLargeWidgetProvider.class);
            todayIntent.setAction(ACTION_WIDGET_TODAY);
            PendingIntent piToday = PendingIntent.getBroadcast(
                    context, 1002, todayIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.btn_widget_today, piToday);

            // Header: Next Month Button '>'
            Intent nextIntent = new Intent(context, MonthlyLargeWidgetProvider.class);
            nextIntent.setAction(ACTION_WIDGET_NEXT_MONTH);
            PendingIntent piNext = PendingIntent.getBroadcast(
                    context, 1003, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.btn_widget_next_month, piNext);

            // Header Title Touch Area: Open App
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openAppIntent.putExtra("select_date", selectedDate);
            openAppIntent.putExtra("jumpToYmd", selectedDate);
            openAppIntent.putExtra("jumpToDay", selDay);
            openAppIntent.putExtra("jumpToMonth", selMonth + 1);
            openAppIntent.putExtra("jumpToYear", selYear);
            PendingIntent piOpenApp = PendingIntent.getActivity(
                    context, 1004, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.header_title_touch, piOpenApp);

            // Bottom Detail Panel Touch Area: Open App
            views.setOnClickPendingIntent(R.id.widget_bottom_panel, piOpenApp);

            // 42 Date Cells on 7x6 Month Grid
            for (int i = 0; i < 42; i++) {
                String cellYmd = cellYmds[i];
                if (cellYmd == null) continue;

                if (cellYmd.equals(selectedDate)) {
                    // Second Tap on already-selected cell opens MainActivity
                    Intent tapSecondIntent = new Intent(context, MainActivity.class);
                    tapSecondIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    tapSecondIntent.putExtra("select_date", cellYmd);
                    tapSecondIntent.putExtra("jumpToYmd", cellYmd);
                    PendingIntent piCellOpen = PendingIntent.getActivity(
                            context, 2000 + i, tapSecondIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    views.setOnClickPendingIntent(CELL_IDS[i], piCellOpen);
                } else {
                    // First Tap on cell: selects date and redraws widget in place
                    Intent tapSelectIntent = new Intent(context, MonthlyLargeWidgetProvider.class);
                    tapSelectIntent.setAction(ACTION_WIDGET_SELECT_DATE);
                    tapSelectIntent.putExtra(EXTRA_DATE_KEY, cellYmd);
                    PendingIntent piCellSelect = PendingIntent.getBroadcast(
                            context, 3000 + i, tapSelectIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    views.setOnClickPendingIntent(CELL_IDS[i], piCellSelect);
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Accurate traditional Chinese lunar day name or holiday.
     * Guarantees:
     * 1. 國慶 ONLY on October 10.
     * 2. Traditional Chinese numerals (初一..三十), no mixed Arabic numerals (廿2, 廿0, 初1).
     */
    public static String getLunarDayName(int gYear, int gMonth0, int gDay) {
        // Solar holidays
        if (gMonth0 == 9 && gDay == 10) return "國慶"; // 10-10 (0-indexed month 9 is October)
        if (gMonth0 == 0 && gDay == 1) return "元旦";  // 01-01
        if (gMonth0 == 1 && gDay == 14) return "情人"; // 02-14
        if (gMonth0 == 9 && gDay == 23) return "霜降"; // 10-23
        if (gMonth0 == 11 && gDay == 25) return "耶誕"; // 12-25

        try {
            android.icu.util.ChineseCalendar cc = new android.icu.util.ChineseCalendar();
            Calendar gc = Calendar.getInstance();
            gc.set(gYear, gMonth0, gDay);
            cc.setTimeInMillis(gc.getTimeInMillis());

            int lMonth = cc.get(android.icu.util.ChineseCalendar.MONTH) + 1;
            int lDay = cc.get(android.icu.util.ChineseCalendar.DAY_OF_MONTH);

            // Major Lunar holidays
            if (lMonth == 1 && lDay == 1) return "春節";
            if (lMonth == 1 && lDay == 15) return "元宵";
            if (lMonth == 5 && lDay == 5) return "端午";
            if (lMonth == 7 && lDay == 7) return "七夕";
            if (lMonth == 7 && lDay == 15) return "中元";
            if (lMonth == 8 && lDay == 15) return "中秋";
            if (lMonth == 9 && lDay == 9) return "重陽";
            if (lMonth == 12 && (lDay == 30 || lDay == 29)) return "除夕";

            if (lDay >= 1 && lDay <= 30) {
                return CHINESE_LUNAR_DAYS[lDay];
            }
        } catch (Throwable ignored) {}

        // Fallback cyclic approximation using Chinese numerals
        int approxDay = ((gDay + 21) % 30) + 1;
        return CHINESE_LUNAR_DAYS[approxDay];
    }

    private static String getFirstEventDisplayForDate(String eventsJson, String dateKey) {
        if (eventsJson == null || eventsJson.isEmpty() || eventsJson.equals("[]")) {
            return null;
        }
        try {
            JSONArray arr = new JSONArray(eventsJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String itemDateKey = obj.optString("dateKey", "");
                String startStr = obj.optString("start", "");
                if (dateKey.equals(itemDateKey) || (!startStr.isEmpty() && startStr.startsWith(dateKey))) {
                    String title = obj.optString("title", "未命名行程");
                    boolean isAllDay = obj.optBoolean("isAllDay", false);
                    if (isAllDay) {
                        return "全天 " + title;
                    }
                    int hour = obj.optInt("startHour", -1);
                    int minute = obj.optInt("startMinute", 0);
                    if (hour == -1 && !startStr.isEmpty()) {
                        try {
                            if (startStr.length() >= 16) {
                                String timePart = startStr.substring(11, 16);
                                return timePart + " " + title;
                            }
                        } catch (Exception ignored) {}
                        hour = 9;
                    }
                    if (hour < 0) hour = 9;
                    return String.format(Locale.US, "%02d:%02d", hour, minute) + " " + title;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static boolean hasEventsForDate(String eventsJson, String dateKey) {
        if (eventsJson == null || eventsJson.isEmpty() || eventsJson.equals("[]")) {
            return false;
        }
        try {
            JSONArray arr = new JSONArray(eventsJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String itemDateKey = obj.optString("dateKey", "");
                String startStr = obj.optString("start", "");
                if (dateKey.equals(itemDateKey) || (!startStr.isEmpty() && startStr.startsWith(dateKey))) {
                    return true;
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    private static void drawTalismanSealBox(Canvas canvas, RectF rect) {
        // Yellow talisman parchment background
        Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgPaint.setColor(Color.parseColor("#FEF3C7")); // Amber 100
        canvas.drawRoundRect(rect, 22, 22, bgPaint);

        // Amber border
        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setColor(Color.parseColor("#D97706")); // Amber 600
        borderPaint.setStrokeWidth(3f);
        canvas.drawRoundRect(rect, 22, 22, borderPaint);

        // Inner cinnabar border
        RectF innerRect = new RectF(rect.left + 8, rect.top + 8, rect.right - 8, rect.bottom - 8);
        Paint innerBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        innerBorder.setStyle(Paint.Style.STROKE);
        innerBorder.setColor(Color.parseColor("#C83E31")); // Chinese cinnabar red
        innerBorder.setStrokeWidth(2f);
        canvas.drawRoundRect(innerRect, 14, 14, innerBorder);

        float cx = rect.centerX();

        // 1. "敕 令"
        Paint chiLingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        chiLingPaint.setColor(Color.parseColor("#C83E31"));
        chiLingPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        chiLingPaint.setTextSize(26);
        chiLingPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("敕 令", cx, rect.top + 42, chiLingPaint);

        // 2. Crystal ball / Talisman icon
        Paint emojiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        emojiPaint.setTextSize(36);
        emojiPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("🔮", cx, rect.top + 86, emojiPaint);

        // 3. "幹話封印"
        Paint sealWordPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        sealWordPaint.setColor(Color.parseColor("#C83E31"));
        sealWordPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        sealWordPaint.setTextSize(22);
        sealWordPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("幹話封印", cx, rect.top + 124, sealWordPaint);

        // 4. "明日解鎖" badge
        Paint subWordPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subWordPaint.setColor(Color.parseColor("#92400E")); // Amber 800
        subWordPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        subWordPaint.setTextSize(14);
        subWordPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("明日解鎖 🔒", cx, rect.top + 152, subWordPaint);
    }

    private static Bitmap getRoundedBitmap(Bitmap bitmap, int size, float cornerRadius) {
        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Rect rect = new Rect(0, 0, size, size);
        RectF rectF = new RectF(rect);

        canvas.drawRoundRect(rectF, cornerRadius, cornerRadius, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, null, rect, paint);
        return output;
    }
}
