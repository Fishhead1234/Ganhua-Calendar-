import { toLocalDateKey } from './dateUtils';

export interface ParsedVoiceSchedule {
  title: string;
  dateKey: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAllDay: boolean;
  matchedDate: boolean;
  matchedTime: boolean;
}

const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  壹: 1,
  二: 2,
  兩: 2,
  貳: 2,
  三: 3,
  參: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function parseChineseOrDigitNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (trimmed === '十') return 10;
  if (trimmed.length === 2 && trimmed.startsWith('十')) {
    const ones = CN_DIGITS[trimmed[1]];
    return ones !== undefined ? 10 + ones : null;
  }
  if (trimmed.length === 2 && trimmed.endsWith('十')) {
    const tens = CN_DIGITS[trimmed[0]];
    return tens !== undefined ? tens * 10 : null;
  }
  if (trimmed.length === 3 && trimmed[1] === '十') {
    const tens = CN_DIGITS[trimmed[0]];
    const ones = CN_DIGITS[trimmed[2]];
    if (tens !== undefined && ones !== undefined) {
      return tens * 10 + ones;
    }
  }
  if (trimmed.length === 1 && CN_DIGITS[trimmed] !== undefined) {
    return CN_DIGITS[trimmed];
  }
  return null;
}

function parseWeekdayChar(ch: string): number | null {
  switch (ch) {
    case '日':
    case '天':
    case '7':
      return 0;
    case '一':
    case '1':
      return 1;
    case '二':
    case '2':
      return 2;
    case '三':
    case '3':
      return 3;
    case '四':
    case '4':
      return 4;
    case '五':
    case '5':
      return 5;
    case '六':
    case '6':
      return 6;
    default:
      return null;
  }
}

const EN_WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function formatTime(hour: number, minute: number): string {
  const h = Math.max(0, Math.min(23, hour));
  const m = Math.max(0, Math.min(59, minute));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseScheduleText(
  text: string,
  referenceDate: Date = new Date()
): ParsedVoiceSchedule {
  const original = (text || '').trim();
  let working = original;
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  let targetDate = new Date(ref);
  let matchedDate = false;
  let inferredPeriodFromDateToken: 'pm' | null = null;

  // 1. Relative Dates (Chinese & English)
  const relPatterns: Array<{
    regex: RegExp;
    offsetDays?: number;
    period?: 'pm';
  }> = [
    { regex: /大後天|大后天/i, offsetDays: 3 },
    { regex: /後天|后天/i, offsetDays: 2 },
    { regex: /明晚/i, offsetDays: 1, period: 'pm' },
    { regex: /今晚/i, offsetDays: 0, period: 'pm' },
    { regex: /明天|明日|\btomorrow\b/i, offsetDays: 1 },
    { regex: /今天|今日|\btoday\b/i, offsetDays: 0 },
  ];

  for (const p of relPatterns) {
    if (p.regex.test(working)) {
      targetDate = new Date(ref);
      targetDate.setDate(ref.getDate() + (p.offsetDays || 0));
      matchedDate = true;
      if (p.period) inferredPeriodFromDateToken = p.period;
      working = working.replace(p.regex, ' ');
      break;
    }
  }

  // 2. Weekday expressions: 下週一 / 這禮拜五 / 星期三 / next monday
  if (!matchedDate) {
    const cnWeekMatch = working.match(
      /(下個?|這個?|本)?(?:禮拜|星期|週|周)([一二三四五六日天1-7])/
    );
    if (cnWeekMatch) {
      const modifier = cnWeekMatch[1] || '';
      const targetDow = parseWeekdayChar(cnWeekMatch[2]);
      if (targetDow !== null) {
        const refDow = ref.getDay();
        let diff = targetDow - refDow;
        if (modifier.startsWith('下')) {
          const daysToNextMonday = ((1 - refDow + 7) % 7) || 7;
          const offsetFromMonday = (targetDow + 6) % 7;
          diff = daysToNextMonday + offsetFromMonday;
        } else if (modifier.startsWith('這') || modifier.startsWith('本')) {
          if (diff < 0) diff += 7;
        } else {
          if (diff < 0) diff += 7;
        }
        targetDate = new Date(ref);
        targetDate.setDate(ref.getDate() + diff);
        matchedDate = true;
        working = working.replace(cnWeekMatch[0], ' ');
      }
    }
  }

  if (!matchedDate) {
    const enWeekMatch = working.match(
      /\b(next|this)?\s*(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\b/i
    );
    if (enWeekMatch) {
      const modifier = (enWeekMatch[1] || '').toLowerCase();
      const targetDow = EN_WEEKDAYS[enWeekMatch[2].toLowerCase()];
      if (targetDow !== undefined) {
        const refDow = ref.getDay();
        let diff = targetDow - refDow;
        if (modifier === 'next') {
          diff = diff <= 0 ? diff + 7 : diff + 7;
        } else if (diff < 0) {
          diff += 7;
        }
        targetDate = new Date(ref);
        targetDate.setDate(ref.getDate() + diff);
        matchedDate = true;
        working = working.replace(enWeekMatch[0], ' ');
      }
    }
  }

  // 3. Explicit Dates: 11月25號 / 11/25 / 25號
  if (!matchedDate) {
    const cnMonthDayMatch = working.match(
      /([一二三四五六七八九十\d]{1,3})月([一二三四五六七八九十\d]{1,3})[號日]?/
    );
    if (cnMonthDayMatch) {
      const m = parseChineseOrDigitNumber(cnMonthDayMatch[1]);
      const d = parseChineseOrDigitNumber(cnMonthDayMatch[2]);
      if (m && d && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        let year = ref.getFullYear();
        const candidate = new Date(year, m - 1, d);
        if (candidate.getTime() < ref.getTime() - 180 * 86400000) {
          year += 1;
        }
        targetDate = new Date(year, m - 1, d);
        matchedDate = true;
        working = working.replace(cnMonthDayMatch[0], ' ');
      }
    }
  }

  if (!matchedDate) {
    const slashDateMatch = working.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
    if (slashDateMatch) {
      const m = parseInt(slashDateMatch[1], 10);
      const d = parseInt(slashDateMatch[2], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        let year = ref.getFullYear();
        const candidate = new Date(year, m - 1, d);
        if (candidate.getTime() < ref.getTime() - 180 * 86400000) {
          year += 1;
        }
        targetDate = new Date(year, m - 1, d);
        matchedDate = true;
        working = working.replace(slashDateMatch[0], ' ');
      }
    }
  }

  if (!matchedDate) {
    const dayOnlyMatch = working.match(/([一二三四五六七八九十\d]{1,3})[號日]/);
    if (dayOnlyMatch) {
      const d = parseChineseOrDigitNumber(dayOnlyMatch[1]);
      if (d && d >= 1 && d <= 31) {
        let month = ref.getMonth();
        let year = ref.getFullYear();
        if (d < ref.getDate()) {
          month += 1;
          if (month > 11) {
            month = 0;
            year += 1;
          }
        }
        targetDate = new Date(year, month, d);
        matchedDate = true;
        working = working.replace(dayOnlyMatch[0], ' ');
      }
    }
  }

  // 4. Period Modifiers
  let period: 'am' | 'noon' | 'pm' | 'dawn' | null = inferredPeriodFromDateToken;
  const periodPatterns: Array<{ regex: RegExp; value: 'am' | 'noon' | 'pm' | 'dawn' }> = [
    { regex: /早上|早晨|清晨|上午|\bam\b/i, value: 'am' },
    { regex: /中午|午間/i, value: 'noon' },
    { regex: /下午|午後|傍晚|晚上|晚間|\bpm\b/i, value: 'pm' },
    { regex: /凌晨/i, value: 'dawn' },
  ];

  for (const p of periodPatterns) {
    if (p.regex.test(working)) {
      period = p.value;
      working = working.replace(p.regex, ' ');
      break;
    }
  }

  // 5. Time Extraction
  let startHour = 9;
  let startMinute = 0;
  let matchedTime = false;

  // 5a. HH:mm (e.g. 15:00, 9:30, 3:45)
  const colonTimeMatch = working.match(/\b(\d{1,2})[:：](\d{2})\b/);
  if (colonTimeMatch) {
    const h = parseInt(colonTimeMatch[1], 10);
    const m = parseInt(colonTimeMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      startHour = h;
      startMinute = m;
      matchedTime = true;
      working = working.replace(colonTimeMatch[0], ' ');
    }
  }

  // 5b. Chinese/Digit hour + 點/時 + optional 半/一刻/三刻/XX分
  if (!matchedTime) {
    const cnTimeMatch = working.match(
      /([零〇一壹二兩貳三參四五六七八九十\d]{1,3})\s*[點時]\s*(半|三刻|一刻|([零〇一二三四五六七八九十\d]{1,3})\s*分?)?/
    );
    if (cnTimeMatch) {
      const parsedHour = parseChineseOrDigitNumber(cnTimeMatch[1]);
      if (parsedHour !== null && parsedHour >= 0 && parsedHour <= 24) {
        startHour = parsedHour === 24 ? 0 : parsedHour;
        const minToken = cnTimeMatch[2] || '';
        if (minToken === '半') {
          startMinute = 30;
        } else if (minToken === '一刻') {
          startMinute = 15;
        } else if (minToken === '三刻') {
          startMinute = 45;
        } else if (cnTimeMatch[3]) {
          const parsedMin = parseChineseOrDigitNumber(cnTimeMatch[3]);
          if (parsedMin !== null && parsedMin >= 0 && parsedMin <= 59) {
            startMinute = parsedMin;
          }
        }
        matchedTime = true;
        working = working.replace(cnTimeMatch[0], ' ');
      }
    }
  }

  // Apply period modifier
  if (matchedTime) {
    if (period === 'pm' && startHour < 12) {
      startHour += 12;
    } else if (period === 'noon' && startHour < 11) {
      startHour += 12;
    } else if (period === 'am' && startHour === 12) {
      startHour = 0;
    } else if (period === 'dawn' && startHour === 12) {
      startHour = 0;
    }
  } else if (period === 'noon') {
    startHour = 12;
    startMinute = 0;
    matchedTime = true;
  }

  const isAllDay = !matchedTime;
  const startTime = formatTime(startHour, startMinute);
  const endHourTotal = startHour + 1;
  const endTime =
    endHourTotal >= 24 ? '23:59' : formatTime(endHourTotal, startMinute);

  // 6. Clean Title
  let cleanedTitle = working
    .replace(/^[\s,，。、!！?？:：\-~的要去有]+/, '')
    .replace(/^(?:幫我)?(?:新增|加入|提醒我|提醒|預約|安排|設定|排程)(?:一個|一場)?[\s,，:：的]*/, '')
    .replace(/^[\s,，。、!！?？:：\-~的]+/, '')
    .replace(/[\s,，。、!！?？:：\-~]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleanedTitle) {
    cleanedTitle = original || '語音新增行程';
  }

  return {
    title: cleanedTitle,
    dateKey: toLocalDateKey(targetDate),
    startTime,
    endTime,
    isAllDay,
    matchedDate,
    matchedTime,
  };
}
