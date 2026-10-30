package com.ganhuacalendar.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "GanhuaWidgetBridge")
public class GanhuaWidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            String monthStr = call.getString("monthStr", "");
            String dayStr = call.getString("dayStr", "");
            String lunarStr = call.getString("lunarStr", "");
            String characterStr = call.getString("characterStr", "🐱 厭世社畜貓");
            String quoteStr = call.getString("quoteStr", "");
            String yijiStr = call.getString("yijiStr", "");
            String offworkStr = call.getString("offworkStr", "目標 18:00 下班");
            String streakStr = call.getString("streakStr", "🔥 連續生還 3 天");
            String characterKey = call.getString("characterKey", "cat");
            String avatarBase64 = call.getString("avatarBase64", "");

            SharedPreferences prefs = getContext().getSharedPreferences(
                    GanhuaWidgetProvider.PREFS_NAME,
                    Context.MODE_PRIVATE
            );
            SharedPreferences.Editor editor = prefs.edit();
            if (!monthStr.isEmpty()) editor.putString("month_str", monthStr);
            if (!dayStr.isEmpty()) editor.putString("day_str", dayStr);
            if (!lunarStr.isEmpty()) editor.putString("lunar_str", lunarStr);
            if (!characterStr.isEmpty()) editor.putString("character_str", characterStr);
            if (!quoteStr.isEmpty()) editor.putString("quote_str", quoteStr);
            if (!yijiStr.isEmpty()) editor.putString("yiji_str", yijiStr);
            if (!offworkStr.isEmpty()) editor.putString("offwork_str", offworkStr);
            if (!streakStr.isEmpty()) editor.putString("streak_str", streakStr);
            if (!characterKey.isEmpty()) editor.putString("character_key", characterKey);

            // If an avatar image is supplied, save to internal files dir
            if (avatarBase64 != null && !avatarBase64.isEmpty()) {
                try {
                    String pureBase64 = avatarBase64;
                    int commaIndex = pureBase64.indexOf(",");
                    if (commaIndex != -1) {
                        pureBase64 = pureBase64.substring(commaIndex + 1);
                    }
                    byte[] decoded = Base64.decode(pureBase64, Base64.DEFAULT);
                    File avatarFile = new File(getContext().getFilesDir(), "widget_current_avatar.png");
                    try (FileOutputStream fos = new FileOutputStream(avatarFile)) {
                        fos.write(decoded);
                        fos.flush();
                    }
                    editor.putBoolean("has_custom_avatar", true);
                } catch (Exception imgEx) {
                    imgEx.printStackTrace();
                }
            }

            editor.apply();

            // Refresh all widgets placed on Android Home Screen
            GanhuaWidgetProvider.updateAllWidgets(getContext());

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to update widget: " + e.getMessage(), e);
        }
    }
}
