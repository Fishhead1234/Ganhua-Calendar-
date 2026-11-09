import specialEventsData from '../data/special_events_quotes.json';
import {
  CalendarMeeting,
  isUserOwnBirthday,
  extractBirthdayPersonName,
} from '../services/calendarService';
import { CalendarQuote, CharacterType } from '../types/calendar';
import { getLunarDetails } from './lunarUtils';
import { getDayOfYear, isSchoolRoastDayOfWeek } from './dateUtils';

export interface SpecialEventQuote {
  id: string;
  eventType: string;
  eventLabel: string;
  triggerKeywords: string[];
  solarDates: string[];
  lunarDates: string[];
  quote: string;
  subtext: string;
  yi: string;
  ji: string;
  character: CharacterType;
  sceneId: string;
  spriteSheet: string;
  spritePosition: string;
  assetPath?: string;
}

export interface MatchSpecialEventParams {
  targetDate: Date;
  calendarEvents?: CalendarMeeting[];
  userBirthday?: { month: number; day: number } | null;
  cycleIndex?: number;
  specialEventsList?: SpecialEventQuote[];
  calendarConnected?: boolean;
}

export interface MatchSpecialEventResult {
  matchedSource: 'birthday' | 'calendar_keyword' | 'holiday' | 'meeting_density' | 'daily_default';
  matchedQuotes: SpecialEventQuote[];
  selectedQuote: SpecialEventQuote | null;
  eventLabel?: string;
  eventType?: string;
  totalCandidates: number;
  selectedIndex: number;
  extractedName?: string;
  isSuppressedByAntiFatigue?: boolean;
}

/**
 * Smart Holiday & Calendar Event Roast Detector
 * Follows strict priority order:
 * 1. User Birthday Override
 * 2. Synced Calendar Event Keyword Match
 * 3. Lunar / Solar Holiday Match
 * 4. Meeting Count Fallback
 * 5. Default Daily Quote
 */
export function matchSpecialEventRoast({
  targetDate,
  calendarEvents = [],
  userBirthday = null,
  cycleIndex = 0,
  specialEventsList = specialEventsData as SpecialEventQuote[],
  calendarConnected = false,
}: MatchSpecialEventParams): MatchSpecialEventResult {
  const targetMonth = targetDate.getMonth() + 1; // 1-12
  const targetDay = targetDate.getDate(); // 1-31
  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');
  const dateKey = `${mm}-${dd}`;

  // 1. User Birthday Override (Strictly User's Own Birthday)
  if (isUserOwnBirthday(targetDate, userBirthday)) {
    return {
      matchedSource: 'birthday',
      matchedQuotes: [],
      selectedQuote: null,
      eventLabel: '🎂 本日壽星最大',
      eventType: 'birthday',
      totalCandidates: 1,
      selectedIndex: 0,
    };
  }

  // 2. Synced Calendar Event Keyword Match
  if (calendarEvents && calendarEvents.length > 0) {
    const titles = calendarEvents.map((evt) =>
      `${evt.title || ''} ${evt.calendarName || ''}`.toLowerCase()
    );
    const keywordMatches: SpecialEventQuote[] = [];

    // Find all items matching any event keyword (excluding other_person_birthday to preserve normal 365 quotes on main card)
    for (const item of specialEventsList) {
      if (item.eventType === 'other_person_birthday') {
        continue; // Never override main card for someone else's birthday
      }
      const isMatched = item.triggerKeywords.some((kw) => {
        const lowerKw = kw.toLowerCase();
        return titles.some((t) => t.includes(lowerKw));
      });
      if (isMatched) {
        keywordMatches.push(item);
      }
    }

    if (keywordMatches.length > 0) {
      // Find the matched eventType and collect all quotes under this eventType
      const primaryEventType = keywordMatches[0].eventType;
      const allForCategory = specialEventsList.filter((item) => item.eventType === primaryEventType);
      const candidates = allForCategory.length > 0 ? allForCategory : keywordMatches;

      const totalCandidates = candidates.length;
      const dayOfYear = getDayOfYear(targetDate);
      const normalizedIndex =
        (((dayOfYear + cycleIndex) % totalCandidates) + totalCandidates) % totalCandidates;
      const selected = candidates[normalizedIndex];

      let label = selected.eventLabel;
      let extractedName: string | undefined;

      if (selected.eventType === 'other_person_birthday') {
        const bdayEvt = calendarEvents.find((evt) => {
          const t = `${evt.title || ''} ${evt.calendarName || ''}`.toLowerCase();
          return ['birthday', 'bday', '生日', '慶生'].some((k) => t.includes(k));
        });
        if (bdayEvt) {
          extractedName = extractBirthdayPersonName(bdayEvt.title || '');
          label = `🎁 社交慶生營業模式（偵測到壽星：${extractedName}）`;
        }
      }

      const isSchoolEvent = selected.eventType === 'school_parent';
      const isSuppressedByAntiFatigue = isSchoolEvent && !isSchoolRoastDayOfWeek(targetDate);

      return {
        matchedSource: 'calendar_keyword',
        matchedQuotes: candidates,
        selectedQuote: selected,
        eventLabel: label,
        eventType: selected.eventType,
        totalCandidates,
        selectedIndex: normalizedIndex,
        extractedName,
        isSuppressedByAntiFatigue,
      };
    }
  }

  // 3. Lunar / Solar Holiday Match
  const lunarInfo = getLunarDetails(targetDate);
  const lunarMonthDay = lunarInfo.lunarMonthDay; // e.g. "正月初一", "七月初七", "八月十五", "十二月廿九"
  // Also check "臘月" alias for "十二月"
  const alternateLunarMonthDay = lunarMonthDay.startsWith('十二月')
    ? lunarMonthDay.replace('十二月', '臘月')
    : lunarMonthDay.startsWith('臘月')
    ? lunarMonthDay.replace('臘月', '十二月')
    : null;

  const holidayMatches: SpecialEventQuote[] = [];

  for (const item of specialEventsList) {
    const isSolarMatch = item.solarDates && item.solarDates.includes(dateKey);
    const isLunarMatch =
      item.lunarDates &&
      (item.lunarDates.includes(lunarMonthDay) ||
        (alternateLunarMonthDay && item.lunarDates.includes(alternateLunarMonthDay)));

    if (isSolarMatch || isLunarMatch) {
      holidayMatches.push(item);
    }
  }

  if (holidayMatches.length > 0) {
    const primaryEventType = holidayMatches[0].eventType;
    const allForHoliday = specialEventsList.filter((item) => item.eventType === primaryEventType);
    const candidates = allForHoliday.length > 0 ? allForHoliday : holidayMatches;

    const totalCandidates = candidates.length;
    const normalizedIndex = ((cycleIndex % totalCandidates) + totalCandidates) % totalCandidates;
    const selected = candidates[normalizedIndex];

    return {
      matchedSource: 'holiday',
      matchedQuotes: candidates,
      selectedQuote: selected,
      eventLabel: selected.eventLabel,
      eventType: selected.eventType,
      totalCandidates,
      selectedIndex: normalizedIndex,
    };
  }

  // 4. Meeting Count Fallback (Density Rule)
  if (calendarConnected && calendarEvents) {
    const count = calendarEvents.length;
    // 5+ meetings = meeting hell
    if (count >= 5) {
      const heavyMeetingQuotes = specialEventsList.filter((item) => item.eventType === 'heavy_meeting');
      if (heavyMeetingQuotes.length > 0) {
        const totalCandidates = heavyMeetingQuotes.length;
        const normalizedIndex = ((cycleIndex % totalCandidates) + totalCandidates) % totalCandidates;
        const selected = heavyMeetingQuotes[normalizedIndex];
        return {
          matchedSource: 'meeting_density',
          matchedQuotes: heavyMeetingQuotes,
          selectedQuote: selected,
          eventLabel: selected.eventLabel,
          eventType: selected.eventType,
          totalCandidates,
          selectedIndex: normalizedIndex,
        };
      }
    }
  }

  // 5. Default Daily Quote
  return {
    matchedSource: 'daily_default',
    matchedQuotes: [],
    selectedQuote: null,
    totalCandidates: 0,
    selectedIndex: 0,
  };
}

/**
 * Applies matched special event roast to the active CalendarQuote
 */
export function applySpecialEventToQuote(
  baseQuote: CalendarQuote,
  specialQuote: SpecialEventQuote,
  totalCandidates: number = 1,
  selectedIndex: number = 0
): CalendarQuote {
  return {
    ...baseQuote,
    quote: specialQuote.quote,
    subtext: specialQuote.subtext,
    yi: specialQuote.yi,
    ji: specialQuote.ji,
    character: specialQuote.character || baseQuote.character,
    sceneId: specialQuote.sceneId || baseQuote.sceneId,
    spriteSheet: specialQuote.spriteSheet || baseQuote.spriteSheet,
    spritePosition: specialQuote.spritePosition || baseQuote.spritePosition,
    assetPath: specialQuote.assetPath || baseQuote.assetPath,
    eventLabel: specialQuote.eventLabel,
    eventType: specialQuote.eventType,
    specialEventCandidatesCount: totalCandidates,
    specialEventIndex: selectedIndex,
  };
}

