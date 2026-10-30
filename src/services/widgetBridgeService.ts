import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { parseQuoteDateDisplay } from '../components/DeskCalendarCard';

export async function syncNativeWidgetData(
  quote: CalendarQuote,
  streakCount: number = 3,
  offWorkHour: number = 18
): Promise<boolean> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  const dateInfo = parseQuoteDateDisplay(quote.date);
  const charMeta = CHARACTER_META[quote.character];

  const payload = {
    monthStr: `${dateInfo.monthEn} • ${dateInfo.weekdayEn}`,
    dayStr: String(dateInfo.dayNumber),
    characterStr: charMeta?.badge || '🐱 厭世社畜貓',
    characterKey: quote.character || 'cat',
    quoteStr: quote.quote,
    yijiStr: `宜：${quote.yi}`,
    offworkStr: `目標 ${offWorkHour}:00 下班`,
    streakStr: `🔥 連續生還 ${streakCount} 天`,
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
