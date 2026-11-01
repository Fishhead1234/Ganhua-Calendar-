package com.ganhuacalendar.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GanhuaWidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        refreshWidgets();
    }

    @Override
    public void onResume() {
        super.onResume();
        refreshWidgets();
    }

    private void refreshWidgets() {
        try {
            GanhuaWidgetProvider.updateAllWidgets(this);
            MonthlySplitWidgetProvider.updateAllWidgets(this);
            MonthlyLargeWidgetProvider.updateAllWidgets(this);
        } catch (Exception ignored) {
        }
    }
}

