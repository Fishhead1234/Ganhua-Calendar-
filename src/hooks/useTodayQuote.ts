import { useMemo } from 'react';
import rawQuotes365 from '../data/quotes365.json';
import {
  CalendarQuote,
  RawStaticQuote365,
  CharacterType,
  QuoteCategory,
} from '../types/calendar';
import { CalendarRoastResult } from '../services/calendarRoastService';

// Lunar date lookup helpers for authentic Taiwanese desk calendar feel
const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const YI_SAMPLES = [
  '喝大杯冰美式・準時打卡下班',
  '帶薪上廁所十五分鐘・安靜放空',
  '戴抗噪耳機裝忙・只回貼圖與收到',
  '點全糖黑糖珍奶・開啟勿擾模式',
  '把今天的工作留給明天的自己',
  '假裝在深入思考系統架構',
  '準時關機人間蒸發',
  '逛網購清空購物車・午休睡飽',
];

const JI_SAMPLES = [
  '在週五下午四點答應「順便開個會」',
  '認真打開銀行帳戶看存款餘額',
  '相信共體時艱與明年調薪大餅',
  '在下班前五分鐘主動問「還有事嗎」',
  '接聽沒有事先傳訊息預告的電話',
  '在週五下午五點進行正式環境部署',
  '睡前滑手機不小心點開公司群組',
  '相信「這場會只要十分鐘就結束」',
];

function getFallbackLunarDate(targetDate: Date): string {
  // Simple cyclic mapping for desk calendar aesthetic
  const day = targetDate.getDate();
  const m = targetDate.getMonth();
  const lunarDay = LUNAR_DAYS[(day + 8) % 30];
  const lunarMonth = LUNAR_MONTHS[m % 12];
  return `農曆 ${lunarMonth}月${lunarDay}`;
}

export function formatQuoteFrom365(
  raw: RawStaticQuote365,
  dateObj: Date
): CalendarQuote {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Theme mapping to category
  let category: QuoteCategory = 'workplace';
  if (raw.theme === 'layflat' || raw.theme === 'laziness') category = 'laziness';
  else if (raw.theme === 'social_battery') category = 'social_battery';
  else if (raw.theme === 'money') category = 'money';
  else if (raw.theme === 'seasonal') category = 'seasonal';

  // Seeded pick for Yi / Ji based on day of year
  const seed = raw.dayOfYear || (raw.month * 31 + raw.day);
  const yi = raw.yi || YI_SAMPLES[seed % YI_SAMPLES.length];
  const ji = raw.ji || JI_SAMPLES[(seed + 3) % JI_SAMPLES.length];
  const lunarDate = raw.lunarDate || getFallbackLunarDate(dateObj);

  return {
    id: `q365-${raw.dateKey || `${raw.month}-${raw.day}`}`,
    date: dateStr,
    month: raw.month,
    day: raw.day,
    quote: raw.quote,
    subtext: raw.subtext,
    character: raw.character as CharacterType,
    category,
    lunarDate,
    yi,
    ji,
    illustrationSvg: `${raw.character}_svg`,
  };
}

interface UseTodayQuoteOptions {
  dateOffset: number; // 0 = today, -1 = yesterday, -2 = 2 days ago ...
  isPro: boolean;
  isAdmin?: boolean;
  allowFutureDates?: boolean;
  calendarConnected: boolean;
  roastResult: CalendarRoastResult | null;
  selectedThemeFilter?: CharacterType | 'all';
}

export function useTodayQuote({
  dateOffset,
  isPro,
  isAdmin = false,
  allowFutureDates = false,
  calendarConnected,
  roastResult,
  selectedThemeFilter = 'all',
}: UseTodayQuoteOptions): {
  currentQuote: CalendarQuote;
  nextQuotePreview: CalendarQuote;
  isToday: boolean;
  isPastDate: boolean;
  isFutureDate: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
} {
  const quotesList = rawQuotes365 as RawStaticQuote365[];

  // 1. Calculate Target Date based on dateOffset (0 = today, -1 = yesterday...)
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);

  const targetMonth = targetDate.getMonth() + 1; // 1-12
  const targetDay = targetDate.getDate(); // 1-31

  // 2. Look up target date directly from quotes365.json
  const baseQuote: CalendarQuote = useMemo(() => {
    // Look up directly by month and day
    let match = quotesList.find(
      (q) => q.month === targetMonth && q.day === targetDay
    );

    // If character filter is active and different from match character
    if (selectedThemeFilter !== 'all' && match && match.character !== selectedThemeFilter) {
      // Find the quote for that theme closest to this date or same theme
      const themeMatch = quotesList.find(
        (q) => q.character === selectedThemeFilter && Math.abs(q.month - targetMonth) <= 1
      ) || quotesList.find((q) => q.character === selectedThemeFilter);
      if (themeMatch) {
        match = themeMatch;
      }
    }

    if (!match) {
      match = quotesList[0];
    }

    const formatted = formatQuoteFrom365(match, targetDate);

    // 3. Dynamic Roast Override (If Pro + Calendar Connected + Today)
    if (dateOffset === 0 && isPro && calendarConnected && roastResult) {
      return {
        ...formatted,
        quote: roastResult.roastQuote,
        subtext: roastResult.roastSubtext,
        yi: roastResult.yi,
        ji: roastResult.ji,
      };
    }

    return formatted;
  }, [
    quotesList,
    targetMonth,
    targetDay,
    targetDate,
    selectedThemeFilter,
    dateOffset,
    isPro,
    calendarConnected,
    roastResult,
  ]);

  // Next quote preview (for under-sheet peeling preview)
  const nextQuotePreview: CalendarQuote = useMemo(() => {
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const nMonth = nextDate.getMonth() + 1;
    const nDay = nextDate.getDate();

    const nMatch = quotesList.find((q) => q.month === nMonth && q.day === nDay) || quotesList[0];
    return formatQuoteFrom365(nMatch, nextDate);
  }, [quotesList, targetDate]);

  const isToday = dateOffset === 0;
  const isPastDate = dateOffset < 0;
  const isFutureDate = dateOffset > 0;
  const canGoNext = allowFutureDates ? true : dateOffset < 0;

  // Free Tier: past 7 days archive. Pro Tier or Admin: unlimited (365 days)
  const maxHistory = isPro || isAdmin ? 365 : 7;
  const canGoPrev = dateOffset > 0 ? true : Math.abs(dateOffset) < maxHistory;

  return {
    currentQuote: baseQuote,
    nextQuotePreview,
    isToday,
    isPastDate,
    isFutureDate,
    canGoNext,
    canGoPrev,
  };
}

