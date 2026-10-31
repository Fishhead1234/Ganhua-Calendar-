import { useMemo, useState, useEffect } from 'react';
import {
  CalendarQuote,
  RawStaticQuote365,
  CharacterType,
  QuoteCategory,
} from '../types/calendar';
import { CalendarRoastResult } from '../services/calendarRoastService';
import { CalendarMeeting } from '../services/calendarService';
import { contentSyncService } from '../services/contentSyncService';
import {
  matchSpecialEventRoast,
  applySpecialEventToQuote,
  MatchSpecialEventResult,
  SpecialEventQuote,
} from '../utils/eventRoastMatcher';

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
    sceneId: raw.sceneId,
    assetPath: raw.assetPath,
    spriteSheet: raw.spriteSheet || `/assets/sheets/${raw.character}_sheet.jpg`,
    spritePosition: raw.spritePosition || '0% 0%',
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
  birthday?: { month: number; day: number } | null;
  calendarEvents?: CalendarMeeting[];
  specialQuoteCycleIndex?: number;
}

export function useTodayQuote({
  dateOffset,
  isPro,
  isAdmin = false,
  allowFutureDates = false,
  calendarConnected,
  roastResult,
  selectedThemeFilter = 'all',
  birthday = null,
  calendarEvents = [],
  specialQuoteCycleIndex = 0,
}: UseTodayQuoteOptions): {
  currentQuote: CalendarQuote;
  nextQuotePreview: CalendarQuote;
  isToday: boolean;
  isPastDate: boolean;
  isFutureDate: boolean;
  isBirthday: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  specialEventResult: MatchSpecialEventResult;
} {
  const [quotesList, setQuotesList] = useState<RawStaticQuote365[]>(() => contentSyncService.getQuotes365());
  const [birthdayQuotesList, setBirthdayQuotesList] = useState<any[]>(() => contentSyncService.getBirthdayQuotes());
  const [specialEventsList, setSpecialEventsList] = useState<SpecialEventQuote[]>(() => contentSyncService.getSpecialEventsQuotes());

  // Subscribe to OTA updates
  useEffect(() => {
    return contentSyncService.subscribe((status) => {
      if (status === 'updated') {
        setQuotesList(contentSyncService.getQuotes365());
        setBirthdayQuotesList(contentSyncService.getBirthdayQuotes());
        setSpecialEventsList(contentSyncService.getSpecialEventsQuotes());
      }
    });
  }, []);

  // 1. Calculate Target Date based on dateOffset (0 = today, -1 = yesterday...)
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);

  const targetMonth = targetDate.getMonth() + 1; // 1-12
  const targetDay = targetDate.getDate(); // 1-31

  const isBirthday = useMemo(() => {
    return Boolean(birthday && birthday.month === targetMonth && birthday.day === targetDay);
  }, [birthday, targetMonth, targetDay]);

  // Special Event Match Result
  const specialEventResult: MatchSpecialEventResult = useMemo(() => {
    return matchSpecialEventRoast({
      targetDate,
      calendarEvents,
      userBirthday: birthday,
      cycleIndex: specialQuoteCycleIndex,
      specialEventsList,
      calendarConnected,
    });
  }, [
    targetDate,
    calendarEvents,
    birthday,
    specialQuoteCycleIndex,
    specialEventsList,
    calendarConnected,
  ]);

  // Priority Resolution for Daily Quote:
  // 1. User Birthday Override
  // 2. Synced Calendar Event Keyword Match
  // 3. Lunar / Solar Holiday Match
  // 4. Meeting Count Fallback
  // 5. Default Daily Quote
  const baseQuote: CalendarQuote = useMemo(() => {
    // Priority 1: User Birthday Override
    if (isBirthday) {
      const bList =
        selectedThemeFilter !== 'all'
          ? birthdayQuotesList.filter((b) => b.character === selectedThemeFilter)
          : birthdayQuotesList;
      const bIndex = (targetDate.getFullYear() + targetMonth * 31 + targetDay) % (bList.length || 1);
      const selectedBday = bList[bIndex] || birthdayQuotesList[0];
      const charType = (selectedThemeFilter !== 'all' ? selectedThemeFilter : selectedBday.character) as CharacterType;

      return {
        id: selectedBday.id,
        date: `${targetDate.getFullYear()}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`,
        month: targetMonth,
        day: targetDay,
        quote: selectedBday.quote,
        subtext: selectedBday.subtext,
        character: charType,
        category: 'workplace',
        lunarDate: '🎂 壽星避難日・今日特權最大',
        yi: '吃整顆草莓蛋糕・準時下班人間蒸發・放空耍廢',
        ji: '在生日這天看公司群組・回覆同事工作訊息・答應加班開會',
        illustrationSvg: `${charType}_svg`,
        sceneId: selectedBday.sceneId || `${charType}_birthday`,
        assetPath: selectedBday.assetPath || `/assets/scenes/${charType}_birthday.webp`,
        spriteSheet: `/assets/sheets/${charType}_sheet.jpg`,
        spritePosition: selectedBday.spritePosition || '100% 100%',
        eventLabel: '🎂 壽星避難模式',
        eventType: 'birthday',
      };
    }

    // Default base quote from quotes365.json
    const match =
      quotesList.find((q) => q.month === targetMonth && q.day === targetDay) || quotesList[0];
    const formatted = formatQuoteFrom365(match, targetDate);

    // If user filtered by specific character, apply preference
    if (selectedThemeFilter !== 'all') {
      formatted.character = selectedThemeFilter;
      formatted.illustrationSvg = `${selectedThemeFilter}_svg`;
      formatted.spriteSheet = `/assets/sheets/${selectedThemeFilter}_sheet.jpg`;
    }

    // Priority 2 & 3: Calendar Event Keyword Match OR Lunar/Solar Holiday Match
    if (
      (specialEventResult.matchedSource === 'calendar_keyword' ||
        specialEventResult.matchedSource === 'holiday') &&
      specialEventResult.selectedQuote
    ) {
      return applySpecialEventToQuote(
        formatted,
        specialEventResult.selectedQuote,
        specialEventResult.totalCandidates,
        specialEventResult.selectedIndex
      );
    }

    // Priority 4: Meeting Count Fallback (Density Rule / Dynamic Roast)
    if (
      specialEventResult.matchedSource === 'meeting_density' &&
      specialEventResult.selectedQuote
    ) {
      return applySpecialEventToQuote(
        formatted,
        specialEventResult.selectedQuote,
        specialEventResult.totalCandidates,
        specialEventResult.selectedIndex
      );
    }

    if (dateOffset === 0 && isPro && calendarConnected && roastResult) {
      const activeSceneId = roastResult.sceneId || formatted.sceneId;
      return {
        ...formatted,
        quote: roastResult.roastQuote,
        subtext: roastResult.roastSubtext,
        yi: roastResult.yi,
        ji: roastResult.ji,
        character: roastResult.character || formatted.character,
        sceneId: activeSceneId,
        assetPath: activeSceneId ? `/assets/scenes/${activeSceneId}.webp` : formatted.assetPath,
        spriteSheet: roastResult.spriteSheet || formatted.spriteSheet,
        spritePosition: roastResult.spritePosition || formatted.spritePosition,
        eventLabel: roastResult.summaryBadge,
      };
    }

    // Priority 5: Default Daily Quote
    return formatted;
  }, [
    isBirthday,
    quotesList,
    birthdayQuotesList,
    targetMonth,
    targetDay,
    targetDate,
    selectedThemeFilter,
    dateOffset,
    isPro,
    calendarConnected,
    roastResult,
    specialEventResult,
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
    isBirthday,
    canGoNext,
    canGoPrev,
    specialEventResult,
  };
}

