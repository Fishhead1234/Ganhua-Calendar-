import { useMemo, useState, useEffect } from 'react';
import {
  CalendarQuote,
  RawStaticQuote365,
  CharacterType,
  QuoteCategory,
} from '../types/calendar';
import { CalendarRoastResult } from '../services/calendarRoastService';
import {
  CalendarMeeting,
  resolveDayContent,
  ResolvedDayContent,
  isUserOwnBirthday,
} from '../services/calendarService';
import { contentSyncService } from '../services/contentSyncService';
import {
  matchSpecialEventRoast,
  applySpecialEventToQuote,
  MatchSpecialEventResult,
  SpecialEventQuote,
} from '../utils/eventRoastMatcher';

import { formatQuoteFrom365 } from '../utils/quoteFormatter';
export { formatQuoteFrom365 };

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
  activePresetId?: string;
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
  activePresetId,
}: UseTodayQuoteOptions): {
  currentQuote: ResolvedDayContent;
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
    return isUserOwnBirthday(targetDate, birthday);
  }, [birthday, targetDate]);

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

  // Single Source of Truth: resolveDayContent
  // Guarantees 100% identical quote, scene, character, and roast badge across Daily Card, Monthly View & Widgets
  const baseQuote: ResolvedDayContent = useMemo(() => {
    return resolveDayContent(targetDate, calendarEvents, {
      quotes: quotesList,
      userBirthday: birthday,
      selectedThemeFilter,
      activePresetId: dateOffset === 0 ? activePresetId : undefined,
      isPro,
      cycleIndex: specialQuoteCycleIndex,
    });
  }, [
    targetDate,
    calendarEvents,
    quotesList,
    birthday,
    selectedThemeFilter,
    dateOffset,
    activePresetId,
    isPro,
    specialQuoteCycleIndex,
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
  const canGoNext = allowFutureDates ? true : dateOffset !== 0;

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

