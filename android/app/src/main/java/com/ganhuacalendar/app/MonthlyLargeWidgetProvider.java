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

public class MonthlyLargeWidgetProvider extends AppWidgetProvider {

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

            Calendar cal = Calendar.getInstance();
            int year = cal.get(Calendar.YEAR);
            int month = cal.get(Calendar.MONTH); // 0-indexed
            int todayDay = cal.get(Calendar.DAY_OF_MONTH);

            String monthEn = cal.getDisplayName(Calendar.MONTH, Calendar.SHORT, Locale.ENGLISH).toUpperCase();
            String quoteStr = prefs.getString("quote_str", "今天行事曆一片淨土，適合安靜當個薪水小偷。");
            String fullLunarStr = prefs.getString("full_lunar_str", "農曆九月廿二・霜降");
            String yiStr = prefs.getString("yi_str", "帶薪上廁所・安靜地當一塊沒用的爛泥");
            int meetingCount = prefs.getInt("meeting_count", 0);
            String characterKey = prefs.getString("character_key", "cat");
            String survivedJson = prefs.getString("survived_dates_json", "[]");

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

            // 1. Top Header Bar (height = 80px, #2D2D2D charcoal)
            float headerHeight = 82;
            Paint topBarPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            topBarPaint.setColor(Color.parseColor("#2D2D2D"));
            canvas.drawRect(0, 0, width, headerHeight, topBarPaint);

            // Left: Rivet dot + Year/Month
            Paint rivetPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            rivetPaint.setColor(Color.parseColor("#D4B483"));
            canvas.drawCircle(35, headerHeight / 2, 7, rivetPaint);

            Paint headerTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            headerTextPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            headerTextPaint.setTextSize(26);
            headerTextPaint.setColor(Color.parseColor("#F9F6F0"));
            canvas.drawText(year + "年 " + (month + 1) + "月 " + monthEn, 56, 52, headerTextPaint);

            // Right: Full Lunar Details (e.g. 農曆九月廿二・霜降)
            Paint lunarHeaderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            lunarHeaderPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.NORMAL));
            lunarHeaderPaint.setTextSize(20);
            lunarHeaderPaint.setColor(Color.parseColor("#D4B483"));
            lunarHeaderPaint.setTextAlign(Paint.Align.RIGHT);
            canvas.drawText(fullLunarStr, width - 30, 52, lunarHeaderPaint);

            // 2. Weekday Header Row
            float gridMargin = 24;
            float gridWidth = width - gridMargin * 2;
            float colWidth = gridWidth / 7.0f;
            float weekHeaderY = 120;

            String[] weekHeaders = {"日", "一", "二", "三", "四", "五", "六"};
            Paint weekPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            weekPaint.setTextSize(18);
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
            canvas.drawLine(gridMargin, 136, width - gridMargin, 136, dividerPaint);

            // 3. Compute Month Days & Lunar Matrix
            Calendar tempCal = Calendar.getInstance();
            tempCal.set(year, month, 1);
            int startDayOfWeek = tempCal.get(Calendar.DAY_OF_WEEK); // 1 = Sun, 7 = Sat
            int daysInMonth = tempCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            tempCal.add(Calendar.MONTH, -1);
            int daysInPrevMonth = tempCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            Paint numPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            numPaint.setTextAlign(Paint.Align.CENTER);

            Paint lunarSubPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            lunarSubPaint.setTextAlign(Paint.Align.CENTER);
            lunarSubPaint.setTextSize(13);

            float rowHeight = 72;
            float gridStartY = 148;

            int dayCounter = 1;
            int nextMonthDayCounter = 1;

            for (int r = 0; r < 5; r++) {
                for (int c = 0; c < 7; c++) {
                    int cellIndex = r * 7 + c;
                    float cx = gridMargin + c * colWidth + colWidth / 2;
                    float cy = gridStartY + r * rowHeight;

                    if (cellIndex < startDayOfWeek - 1) {
                        // Previous Month Days
                        int prevDay = daysInPrevMonth - (startDayOfWeek - 2 - cellIndex);
                        numPaint.setColor(Color.parseColor("#C5BEB3"));
                        numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.NORMAL));
                        numPaint.setTextSize(22);
                        canvas.drawText(String.valueOf(prevDay), cx, cy + 24, numPaint);

                        lunarSubPaint.setColor(Color.parseColor("#C5BEB3"));
                        canvas.drawText("初一", cx, cy + 48, lunarSubPaint);
                    } else if (dayCounter <= daysInMonth) {
                        // Current Month Days
                        boolean isToday = (dayCounter == todayDay);
                        String dayYmd = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayCounter);
                        boolean hasSurvived = survivedJson.contains(dayYmd);

                        if (isToday) {
                            // Dark highlight square for Today
                            RectF todayBox = new RectF(cx - 30, cy + 2, cx + 30, cy + 64);
                            Paint todayBoxPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                            todayBoxPaint.setColor(Color.parseColor("#2D2D2D"));
                            canvas.drawRoundRect(todayBox, 14, 14, todayBoxPaint);

                            numPaint.setColor(Color.WHITE);
                            numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                            numPaint.setTextSize(24);
                            canvas.drawText(String.valueOf(dayCounter), cx, cy + 28, numPaint);

                            lunarSubPaint.setColor(Color.parseColor("#D4B483"));
                            canvas.drawText("今日", cx, cy + 50, lunarSubPaint);

                            // Today meeting dot indicator
                            if (meetingCount > 0) {
                                Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                                dotPaint.setColor(Color.parseColor("#C83E31"));
                                canvas.drawCircle(cx, cy + 58, 3.5f, dotPaint);
                            }
                        } else {
                            if (hasSurvived && dayCounter < todayDay) {
                                // Tiny survived stamp badge
                                Paint stampTagPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                                stampTagPaint.setColor(Color.parseColor("#C83E31"));
                                stampTagPaint.setTextSize(10);
                                stampTagPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                                canvas.drawText("生還", cx + 18, cy + 12, stampTagPaint);
                            }

                            if (c == 0) {
                                numPaint.setColor(Color.parseColor("#C83E31")); // Sunday
                            } else {
                                numPaint.setColor(Color.parseColor("#2D2D2D"));
                            }
                            numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
                            numPaint.setTextSize(22);
                            canvas.drawText(String.valueOf(dayCounter), cx, cy + 24, numPaint);

                            // Approximate Lunar sub-tag
                            String subTag = "廿二";
                            int lunarApprox = (dayCounter + 22) % 30;
                            if (lunarApprox == 0) lunarApprox = 30;
                            if (lunarApprox == 1) subTag = "初一";
                            else if (lunarApprox == 15) subTag = "十五";
                            else if (dayCounter == 23) subTag = "霜降";
                            else if (dayCounter == 10) subTag = "國慶";
                            else subTag = "廿" + (dayCounter % 10);

                            if ("霜降".equals(subTag) || "國慶".equals(subTag) || "初一".equals(subTag)) {
                                lunarSubPaint.setColor(Color.parseColor("#C83E31"));
                                lunarSubPaint.setTypeface(Typeface.DEFAULT_BOLD);
                            } else {
                                lunarSubPaint.setColor(Color.parseColor("#6E6A63"));
                                lunarSubPaint.setTypeface(Typeface.DEFAULT);
                            }
                            canvas.drawText(subTag, cx, cy + 46, lunarSubPaint);
                        }
                        dayCounter++;
                    } else {
                        // Next Month Days
                        numPaint.setColor(Color.parseColor("#C5BEB3"));
                        numPaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.NORMAL));
                        numPaint.setTextSize(22);
                        canvas.drawText(String.valueOf(nextMonthDayCounter), cx, cy + 24, numPaint);

                        lunarSubPaint.setColor(Color.parseColor("#C5BEB3"));
                        canvas.drawText("初" + nextMonthDayCounter, cx, cy + 46, lunarSubPaint);
                        nextMonthDayCounter++;
                    }
                }
            }

            // 4. Bottom Footer Strip (y = 550 to 800)
            float footerY = 550;
            Paint footerBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            footerBgPaint.setColor(Color.parseColor("#F5F0E6"));
            canvas.drawRect(0, footerY, width, height, footerBgPaint);
            canvas.drawLine(0, footerY, width, footerY, dividerPaint);

            // Character Illustration Thumbnail
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
                int avatarSize = 180;
                Bitmap roundedAvatar = getRoundedBitmap(avatarBitmap, avatarSize, 24);

                // White card background for illustration
                Paint avatarCardBg = new Paint(Paint.ANTI_ALIAS_FLAG);
                avatarCardBg.setColor(Color.WHITE);
                RectF avRect = new RectF(28, footerY + 28, 28 + avatarSize, footerY + 28 + avatarSize);
                canvas.drawRoundRect(avRect, 24, 24, avatarCardBg);

                canvas.drawBitmap(roundedAvatar, 28, footerY + 28, null);
                canvas.drawRoundRect(avRect, 24, 24, dividerPaint);
            }

            // Quote & Info on Right of Footer
            float footerTextX = 236;
            float footerTextW = width - footerTextX - 30;

            TextPaint quotePaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
            quotePaint.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
            quotePaint.setTextSize(24);
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
            canvas.translate(footerTextX, footerY + 36);
            quoteLayout.draw(canvas);
            canvas.restore();

            // 宜 & 会议 Tag Bar
            Paint yiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            yiPaint.setTypeface(Typeface.DEFAULT_BOLD);
            yiPaint.setTextSize(17);
            yiPaint.setColor(Color.parseColor("#C83E31"));
            String shortYi = yiStr.length() > 16 ? yiStr.substring(0, 16) + "…" : yiStr;
            canvas.drawText("宜：" + shortYi, footerTextX, footerY + 185, yiPaint);

            Paint meetingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            meetingPaint.setTextSize(16);
            meetingPaint.setColor(Color.parseColor("#6E6A63"));
            canvas.drawText("📅 今日 " + meetingCount + " 場會議", footerTextX, footerY + 215, meetingPaint);

            // Card outer stroke
            canvas.drawRoundRect(cardRect, 36, 36, dividerPaint);

            // Bind to RemoteViews
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_monthly_large);
            views.setImageViewBitmap(R.id.iv_monthly_large_canvas, bitmap);

            // Tap to open App
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_monthly_large_root, pendingIntent);

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
