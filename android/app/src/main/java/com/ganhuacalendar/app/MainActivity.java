package com.ganhuacalendar.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GanhuaWidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        try {
            GanhuaWidgetProvider.updateAllWidgets(this);
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            GanhuaWidgetProvider.updateAllWidgets(this);
        } catch (Exception ignored) {
        }
    }
}

