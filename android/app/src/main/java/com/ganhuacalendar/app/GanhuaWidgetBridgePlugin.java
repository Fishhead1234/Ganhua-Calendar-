package com.ganhuacalendar.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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

