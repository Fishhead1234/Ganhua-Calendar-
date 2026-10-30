import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { parseQuoteDateDisplay } from '../components/DeskCalendarCard';

export async function syncNativeWidgetData(quote: CalendarQuote): Promise<boolean> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  const dateInfo = parseQuoteDateDisplay(quote.date);
  const charMeta = CHARACTER_META[quote.character];

  const payload = {
    monthStr: `${dateInfo.monthZh} / ${dateInfo.monthEn}`,
    dayStr: String(dateInfo.dayNumber),
    lunarStr: quote.lunarDate,
    characterStr: `${charMeta?.badge || '🐱 社畜貓'}`,
    quoteStr: `「${quote.quote}」`,
    yijiStr: `宜：${quote.yi} / 忌：${quote.ji}`,
  };

  // 1. Sync to native Android widget via Capacitor Plugin Bridge
  if (isNative && (window as any).Capacitor.Plugins?.GanhuaWidgetBridge) {
    try {
      await (window as any).Capacitor.Plugins.GanhuaWidgetBridge.updateWidgetData(payload);
      return true;
    } catch (e) {
      console.warn('Native widget sync failed:', e);
    }
  }

  // 2. Also save to localStorage for local / PWA caching
  try {
    localStorage.setItem('ganhua_widget_latest_quote_v1', JSON.stringify(payload));
  } catch {
    // ignore
  }

  return false;
}

