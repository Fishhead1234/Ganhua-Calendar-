import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { parseQuoteDateDisplay } from '../components/DeskCalendarCard';

async function extractSpriteAvatarBase64(
  spriteSheetUrl?: string,
  spritePosition?: string
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (!spriteSheetUrl) return null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: string | null) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      finish(null);
    }, 1500);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const renderCrop = () => {
      try {
        const parts = (spritePosition || '0% 0%')
          .split(/\s+/)
          .map((p) => parseFloat(p.replace('%', '')));
        const posX = isNaN(parts[0]) ? 0 : parts[0];
        const posY = isNaN(parts[1]) ? 0 : parts[1];

        // 3x3 grid column and row (0, 1, or 2)
        const col = posX >= 75 ? 2 : posX >= 25 ? 1 : 0;
        const row = posY >= 75 ? 2 : posY >= 25 ? 1 : 0;

        const cellW = img.naturalWidth / 3;
        const cellH = img.naturalHeight / 3;

        const targetSize = 160;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }

        // Clip to rounded rectangle
        const r = 16;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(targetSize - r, 0);
        ctx.quadraticCurveTo(targetSize, 0, targetSize, r);
        ctx.lineTo(targetSize, targetSize - r);
        ctx.quadraticCurveTo(targetSize, targetSize, targetSize - r, targetSize);
        ctx.lineTo(r, targetSize);
        ctx.quadraticCurveTo(0, targetSize, 0, targetSize - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();

        // Draw corresponding cell from 3x3 sprite sheet
        ctx.drawImage(
          img,
          col * cellW,
          row * cellH,
          cellW,
          cellH,
          0,
          0,
          targetSize,
          targetSize
        );

        const dataUrl = canvas.toDataURL('image/png');
        finish(dataUrl);
      } catch (err) {
        console.warn('Failed to extract avatar base64:', err);
        finish(null);
      }
    };

    img.onload = renderCrop;
    img.onerror = () => finish(null);

    // If already cached
    img.src = spriteSheetUrl;
    if (img.complete && img.naturalWidth > 0) {
      renderCrop();
    }
  });
}

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

  // Dynamically crop the exact scene illustration for today's quote
  const avatarBase64 = await extractSpriteAvatarBase64(quote.spriteSheet, quote.spritePosition);

  const payload = {
    monthStr: `${dateInfo.monthEn} • ${dateInfo.weekdayEn}`,
    dayStr: String(dateInfo.dayNumber),
    characterStr: charMeta?.badge || '🐱 厭世社畜貓',
    characterKey: quote.character || 'cat',
    quoteStr: quote.quote,
    yijiStr: `宜：${quote.yi}`,
    offworkStr: `目標 ${offWorkHour}:00 下班`,
    streakStr: `🔥 連續生還 ${streakCount} 天`,
    avatarBase64: avatarBase64 || '',
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
