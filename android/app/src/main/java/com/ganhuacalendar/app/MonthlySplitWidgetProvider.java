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

public class MonthlySplitWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, MonthlySplitWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int widgetId : allWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(GanhuaWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);

            Calendar cal = Calendar.getInstance();
            int year = cal.get(Calendar.YEAR);
            int month = cal.get(Calendar.MONTH); // 0-indexed
            int todayDay = cal.get(Calendar.DAY_OF_MONTH);
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK); // 1 = Sun, 7 = Sat

            String monthEn = cal.getDisplayName(Calendar.MONTH, Calendar.SHORT, Locale.ENGLISH).toUpperCase();
            String[] weekdayNamesZh = {"星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"};
            String weekdayZh = weekdayNamesZh[dayOfWeek - 1];

            String quoteStr = prefs.getString("quote_str", "只要我不努力，老闆就沒辦法利用我。");
            String lunarStr = prefs.getString("lunar_str", "農曆九月廿二");
            if (!lunarStr.startsWith("(") && !lunarStr.startsWith("農曆")) {
                lunarStr = "農曆" + lunarStr;
            }
            String characterKey = prefs.getString("character_key", "cat");

            // Render high-DPI Bitmap Canvas for 4x2 split card
            int width = 840;
            int height = 420;
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            // Card background (#F9F6F0 cream with rounded corners)
            Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            bgPaint.setColor(Color.parseColor("#F9F6F0"));
            RectF cardRect = new RectF(4, 4, width - 4, height - 4);
            canvas.drawRoundRect(cardRect, 32, 32, bgPaint);

            // Border stroke (#2D2D2D, 2.5px)
            Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            borderPaint.setStyle(Paint.Style.STROKE);
            borderPaint.setStrokeWidth(2.5f);
            borderPaint.setColor(Color.parseColor("#262D2D2D"));
            canvas.drawRoundRect(cardRect, 32, 32, borderPaint);

            // Left Section: Mini 7-Column Calendar Grid
            float leftMargin = 30;
            float leftWidth = 360;

            // Header: "2026年 10月 OCT"
            Paint headerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            headerPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            headerPaint.setTextSize(26);
            headerPaint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawText(year + "年 " + (month + 1) + "月", leftMargin, 48, headerPaint);

            Paint enMonthPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            enMonthPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
            enMonthPaint.setTextSize(20);
            enMonthPaint.setColor(Color.parseColor("#6E6A63"));
            canvas.drawText(monthEn, leftMargin + leftWidth - 55, 48, enMonthPaint);

            // Weekday Row: 日 一 二 三 四 五 六
            String[] weekHeaders = {"日", "一", "二", "三", "四", "五", "六"};
            Paint weekPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            weekPaint.setTextSize(18);
            weekPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            weekPaint.setTextAlign(Paint.Align.CENTER);

            float colWidth = leftWidth / 7.0f;
            float weekY = 88;
            for (int i = 0; i < 7; i++) {
                weekPaint.setColor(i == 0 ? Color.parseColor("#C83E31") : Color.parseColor("#6E6A63"));
                canvas.drawText(weekHeaders[i], leftMargin + i * colWidth + colWidth / 2, weekY, weekPaint);
            }

            // Divider line below weekday header
            Paint dividerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            dividerPaint.setColor(Color.parseColor("#262D2D2D"));
            dividerPaint.setStrokeWidth(1.5f);
            canvas.drawLine(leftMargin, 102, leftMargin + leftWidth, 102, dividerPaint);

            // Compute Month Days
            Calendar tempCal = Calendar.getInstance();
            tempCal.set(year, month, 1);
            int startDayOfWeek = tempCal.get(Calendar.DAY_OF_WEEK); // 1 = Sun, 7 = Sat
            int daysInMonth = tempCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            tempCal.add(Calendar.MONTH, -1);
            int daysInPrevMonth = tempCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            Paint dayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            dayPaint.setTextAlign(Paint.Align.CENTER);
            dayPaint.setTextSize(20);

            Paint todayBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            todayBgPaint.setColor(Color.parseColor("#2D2D2D"));

            float rowHeight = 46;
            float gridStartY = 138;

            int dayCounter = 1;
            int nextMonthDayCounter = 1;
            for (int r = 0; r < 6; r++) {
                for (int c = 0; c < 7; c++) {
                    int cellIndex = r * 7 + c;
                    float cx = leftMargin + c * colWidth + colWidth / 2;
                    float cy = gridStartY + r * rowHeight;

                    if (cellIndex < startDayOfWeek - 1) {
                        // Previous month day
                        int prevDay = daysInPrevMonth - (startDayOfWeek - 2 - cellIndex);
                        dayPaint.setColor(Color.parseColor("#C5BEB3"));
                        dayPaint.setTypeface(Typeface.DEFAULT);
                        canvas.drawText(String.valueOf(prevDay), cx, cy, dayPaint);
                    } else if (dayCounter <= daysInMonth) {
                        // Current month day
                        boolean isToday = (dayCounter == todayDay);
                        if (isToday) {
                            RectF todayBox = new RectF(cx - 18, cy - 24, cx + 18, cy + 12);
                            canvas.drawRoundRect(todayBox, 8, 8, todayBgPaint);
                            dayPaint.setColor(Color.WHITE);
                            dayPaint.setTypeface(Typeface.DEFAULT_BOLD);
                        } else if (c == 0) {
                            dayPaint.setColor(Color.parseColor("#C83E31")); // Sunday
                            dayPaint.setTypeface(Typeface.DEFAULT);
                        } else {
                            dayPaint.setColor(Color.parseColor("#2D2D2D"));
                            dayPaint.setTypeface(Typeface.DEFAULT);
                        }
                        canvas.drawText(String.valueOf(dayCounter), cx, cy, dayPaint);
                        dayCounter++;
                    } else if (r < 5) {
                        // Next month day (only render 5 rows to keep clean)
                        dayPaint.setColor(Color.parseColor("#C5BEB3"));
                        dayPaint.setTypeface(Typeface.DEFAULT);
                        canvas.drawText(String.valueOf(nextMonthDayCounter++), cx, cy, dayPaint);
                    }
                }
            }

            // Middle Vertical Divider Line
            canvas.drawLine(418, 28, 418, height - 28, dividerPaint);

            // Right Section: Date + Quote + Mini Avatar + Red Stamp
            float rightMargin = 444;
            float rightWidth = width - rightMargin - 30;

            // Top Date Header: "10/31 星期六"
            Paint dateTitlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            dateTitlePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            dateTitlePaint.setTextSize(26);
            dateTitlePaint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawText((month + 1) + "/" + todayDay + " " + weekdayZh, rightMargin, 48, dateTitlePaint);

            // Sub Lunar text: "(農曆九月廿二)"
            Paint lunarSubPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            lunarSubPaint.setTextSize(16);
            lunarSubPaint.setColor(Color.parseColor("#6E6A63"));
            canvas.drawText("(" + lunarStr + ")", rightMargin, 74, lunarSubPaint);

            // Divider under date header
            canvas.drawLine(rightMargin, 88, rightMargin + rightWidth, 88, dividerPaint);

            // Gàn-huà Quote Text (Wrapped)
            TextPaint quotePaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
            quotePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            quotePaint.setTextSize(22);
            quotePaint.setColor(Color.parseColor("#2D2D2D"));

            String displayQuote = "「" + quoteStr + "」";
            StaticLayout quoteLayout = new StaticLayout(
                    displayQuote,
                    quotePaint,
                    (int) rightWidth,
                    Layout.Alignment.ALIGN_NORMAL,
                    1.25f,
                    0.0f,
                    false
            );

            canvas.save();
            canvas.translate(rightMargin, 108);
            quoteLayout.draw(canvas);
            canvas.restore();

            // Bottom Left of Right Section: Character Avatar
            Bitmap avatarBitmap = null;
            String syncedSheet = prefs.getString("sprite_sheet", "");
            String syncedPos = prefs.getString("sprite_position", "");
            if (syncedSheet != null && !syncedSheet.isEmpty()) {
                try {
                    avatarBitmap = DeskCardWidgetProvider.getSpriteCellBitmap(context, syncedSheet, syncedPos, characterKey);
                } catch (Exception ignored) {}
            }
            if (avatarBitmap == null) {
                File avatarFile = new File(context.getFilesDir(), "widget_current_avatar.png");
                if (avatarFile.exists() && avatarFile.length() > 0) {
                    try {
                        avatarBitmap = BitmapFactory.decodeFile(avatarFile.getAbsolutePath());
                    } catch (Exception ignored) {}
                }
            }
            if (avatarBitmap == null) {
                int fallbackRes = R.drawable.widget_char_cat;
                if ("capybara".equals(characterKey)) fallbackRes = R.drawable.widget_char_capybara;
                else if ("ghost".equals(characterKey)) fallbackRes = R.drawable.widget_char_ghost;
                avatarBitmap = BitmapFactory.decodeResource(context.getResources(), fallbackRes);
            }

            if (avatarBitmap != null) {
                int avatarSize = 105;
                Bitmap roundedAvatar = getRoundedBitmap(avatarBitmap, avatarSize, 18);
                canvas.drawBitmap(roundedAvatar, rightMargin, height - avatarSize - 25, null);
            }

            // Bottom Right of Right Section: Stamp ("已生還" vs "待蓋章")
            String todayYmd = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, todayDay);
            String survivedJson = prefs.getString("survived_dates_json", "[]");
            boolean isTodaySurvived = survivedJson.contains(todayYmd);

            canvas.save();
            canvas.translate(width - 130, height - 60);
            canvas.rotate(-8);

            Paint stampBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            stampBgPaint.setColor(Color.parseColor("#FAF7F0"));
            RectF stampBox = new RectF(-45, -22, 45, 22);
            canvas.drawRoundRect(stampBox, 8, 8, stampBgPaint);

            Paint stampBorderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            stampBorderPaint.setStyle(Paint.Style.STROKE);
            stampBorderPaint.setStrokeWidth(isTodaySurvived ? 3.0f : 2.0f);
            stampBorderPaint.setColor(Color.parseColor(isTodaySurvived ? "#C83E31" : "#9E988D"));
            canvas.drawRoundRect(stampBox, 8, 8, stampBorderPaint);

            Paint stampTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            stampTextPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            stampTextPaint.setTextAlign(Paint.Align.CENTER);
            stampTextPaint.setTextSize(20);
            stampTextPaint.setColor(Color.parseColor(isTodaySurvived ? "#C83E31" : "#78736B"));
            canvas.drawText(isTodaySurvived ? "已生還" : "待蓋章", 0, 7, stampTextPaint);

            canvas.restore();

            // Bind to RemoteViews
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_monthly_split);
            views.setImageViewBitmap(R.id.iv_monthly_split_canvas, bitmap);

            // Tap to open App
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_monthly_split_root, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
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

