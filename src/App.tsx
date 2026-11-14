import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fireConfetti } from './utils/confettiHelper';
import {
  Stamp,
  Share2,
  Sparkles,
  Calendar as CalendarIcon,
  RotateCcw,
  Scissors,
} from 'lucide-react';
import quotesData from './data/quotes.json';
import { CalendarQuote, CharacterType } from './types/calendar';
import { TopBar } from './components/TopBar';
import { DeskCalendar } from './components/DeskCalendar';
import { IgStoryModal } from './components/IgStoryModal';
import { PaywallModal } from './components/PaywallModal';
import { CalendarSyncBar } from './components/CalendarSyncBar';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { AdminConsoleModal } from './components/AdminConsoleModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { BirthdayModal } from './components/BirthdayModal';
import { FloatingVersionBar } from './components/FloatingVersionBar';
import { DailyAgendaStrip } from './components/DailyAgendaStrip';
import { MonthlyCalendarModal } from './components/MonthlyCalendarModal';
import { AddEventModal } from './components/AddEventModal';
import { DeleteEventConfirmModal } from './components/DeleteEventConfirmModal';
import { syncNativeWidgetData } from './services/widgetBridgeService';
import { playPaperTearSound, playStampSound } from './utils/soundEffects';
import { toLocalDateKey, getTodayLocalDateKey } from './utils/dateUtils';
import { useSubscription } from './hooks/useSubscription';
import { useTodayQuote } from './hooks/useTodayQuote';
import { contentSyncService } from './services/contentSyncService';
import { AppTier } from './services/purchaseService';
import {
  CalendarMeeting,
  CalendarRoastResult,
  MOCK_CALENDAR_PRESETS,
  analyzeCalendarEvents,
  fetchNativeDeviceCalendarEvents,
  fetchLiveJsonCalendarEvents,
  fetchLiveCalendarFeed,
  CustomCalendarEvent,
  getCustomEvents,
  saveCustomEvent,
  deleteCustomEvent,
  getMergedEvents,
  customEventToMeeting,
  applySyncedEventCustomizations,
  saveSyncedEventOverride,
  markSyncedEventDeleted,
  hideSyncedEvent,
  clearSyncedEventCustomizations,
  writeNativeDeviceCalendarEvent,
  deleteNativeDeviceCalendarEvent,
  createAndroidCalendarEvent,
  deleteAndroidCalendarEventById,
  pushEventToGoogleAppsScript,
  scheduleEventNotificationsViaBridge,
  cancelEventNotificationsViaBridge,
  syncAllCalendarRemindersViaBridge,
  cancelAllCalendarRemindersViaBridge,
  sendTestNotificationViaBridge,
} from './services/calendarService';

const STORAGE_KEY = 'ganhua_calendar_state_v3';

interface PersistedState {
  selectedTheme: CharacterType | 'all';
  dateOffset: number; // 0 = today, -1 = yesterday, -2 = 2 days ago ...
  favoritedIds: string[];
  survivedDates: string[];
  streakCount: number;
  offWorkHour: number;
  artStyle: 'original' | 'svg';
  calendarConnected: boolean;
  birthday?: { month: number; day: number } | null;
  lastOpenedDateStr?: string; // YYYY-MM-DD: tracks last torn/opened date
}

function getTodayYmd(): string {
  return getTodayLocalDateKey();
}

/**
 * Tear-to-Unlock Today Ritual:
 * If Today (todayKey) has not been torn yet (last_torn_to_date !== todayKey),
 * compute initial offset to start on last_torn_to_date (or yesterday = -1 if missing or >3 days).
 */
function computeInitialDateOffset(todayYmd: string): number {
  try {
    const storedLastTorn = localStorage.getItem('last_torn_to_date');
    if (storedLastTorn === todayYmd) {
      return 0; // Today has already been torn/unlocked
    }
    if (storedLastTorn && /^\d{4}-\d{2}-\d{2}$/.test(storedLastTorn)) {
      const [ty, tm, td] = todayYmd.split('-').map(Number);
      const [ly, lm, ld] = storedLastTorn.split('-').map(Number);
      const todayMid = new Date(ty, tm - 1, td).getTime();
      const lastMid = new Date(ly, lm - 1, ld).getTime();
      const diffDays = Math.round((todayMid - lastMid) / 86400000);
      if (diffDays >= 1 && diffDays <= 3) {
        return -diffDays; // 1, 2, or 3 days ago so user only needs 1-3 satisfying tears to reach Today
      }
    }
  } catch {
    // ignore
  }
  // Default to yesterday (-1) so user gets to tear off yesterday's sheet to reveal Today!
  return -1;
}

function loadPersistedState(): PersistedState {
  const todayYmd = getTodayYmd();
  const initialOffset = computeInitialDateOffset(todayYmd);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        selectedTheme: parsed.selectedTheme || 'all',
        dateOffset: initialOffset,
        favoritedIds: Array.isArray(parsed.favoritedIds) ? parsed.favoritedIds : ['q365-01-01'],
        survivedDates: Array.isArray(parsed.survivedDates) ? parsed.survivedDates : [],
        streakCount: typeof parsed.streakCount === 'number' ? parsed.streakCount : 3,
        offWorkHour: typeof parsed.offWorkHour === 'number' ? parsed.offWorkHour : 18,
        artStyle: parsed.artStyle === 'svg' ? 'svg' : 'original',
        calendarConnected: Boolean(parsed.calendarConnected),
        birthday: (() => {
          let b =
            parsed.birthday &&
            typeof parsed.birthday.month === 'number' &&
            typeof parsed.birthday.day === 'number'
              ? parsed.birthday
              : null;
          if (!b) {
            try {
              const stored = localStorage.getItem('user_birthday');
              if (stored && stored.includes('-')) {
                const [m, d] = stored.split('-').map(Number);
                if (m && d) b = { month: m, day: d };
              }
            } catch {}
          } else {
            try {
              const mm = String(b.month).padStart(2, '0');
              const dd = String(b.day).padStart(2, '0');
              localStorage.setItem('user_birthday', `${mm}-${dd}`);
            } catch {}
          }
          return b;
        })(),
        lastOpenedDateStr: todayYmd,
      };
    }
  } catch {
    // ignore
  }
  return {
    selectedTheme: 'all',
    dateOffset: initialOffset,
    favoritedIds: ['q365-01-01'],
    survivedDates: [],
    streakCount: 3,
    offWorkHour: 18,
    artStyle: 'original',
    calendarConnected: false,
    birthday: null,
    lastOpenedDateStr: todayYmd,
  };
}

export const App: React.FC = () => {
  const allQuotes = quotesData as CalendarQuote[];
  const {
    tier,
    isPro,
    isAdmin,
    isAdminAuthed,
    trialInfo,
    isFreeTrialActive,
    trialDaysRemaining,
    trialDaysTotal,
    isPaidPro,
    isLoading: isSubLoading,
    loginAdmin,
    logoutAdmin,
    setTier,
    purchase,
    restore,
    restoreWithTransferId,
    toggleMockPro,
  } = useSubscription();

  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isIgModalOpen, setIsIgModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isCalendarSyncModalOpen, setIsCalendarSyncModalOpen] = useState(false);
  const [isDevModeUnlocked, setIsDevModeUnlocked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('ganhua_dev_mode_unlocked') === 'true';
  });
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const [isMonthlyCalendarOpen, setIsMonthlyCalendarOpen] = useState(false);
  const [specialQuoteCycleIndex, setSpecialQuoteCycleIndex] = useState(0);
  const [allowFutureDates, setAllowFutureDates] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);

  // Calendar Roast State
  const [activeMeetings, setActiveMeetings] = useState<CalendarMeeting[]>(() => {
    try {
      const saved = localStorage.getItem('ganhua_calendar_meetings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return MOCK_CALENDAR_PRESETS[0].events;
  });
  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ganhua_active_preset_id');
    } catch {
      return null;
    }
  });

  const currentDateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + persisted.dateOffset);
    return d;
  }, [persisted.dateOffset]);

  const currentDateKey = useMemo(() => {
    return toLocalDateKey(currentDateObj);
  }, [currentDateObj]);

  // User-toggled card view mode ('roast' vs 'original') per date
  const [cardViewModeMap, setCardViewModeMap] = useState<Record<string, 'roast' | 'original'>>({});
  const currentCardViewMode = cardViewModeMap[currentDateKey];

  // Custom Appointments State
  const [customEvents, setCustomEvents] = useState<CustomCalendarEvent[]>(() => getCustomEvents());
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [addEventInitialDate, setAddEventInitialDate] = useState<string>('');
  const [editingCustomEvent, setEditingCustomEvent] = useState<CustomCalendarEvent | null>(null);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<CalendarMeeting | null>(null);

  // Merged meetings for currently viewed date
  const effectiveMeetings = useMemo(() => {
    return getMergedEvents(activeMeetings, currentDateKey);
  }, [activeMeetings, customEvents, currentDateKey]);

  // All merged meetings across all dates for month widget & reminder sync
  const allAppointments = useMemo(() => {
    const customAsMeetings: CalendarMeeting[] = (customEvents || []).map(customEventToMeeting);
    const customizedSynced = applySyncedEventCustomizations(activeMeetings);
    return [...customizedSynced, ...customAsMeetings];
  }, [activeMeetings, customEvents]);

  const roastResult: CalendarRoastResult = useMemo(() => {
    return analyzeCalendarEvents(effectiveMeetings, activePresetId || undefined, 0, currentDateObj);
  }, [effectiveMeetings, activePresetId, currentDateObj]);

  const todayKey = useMemo(() => getTodayYmd(), []);

  const [isTodayUnlocked, setIsTodayUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('last_torn_to_date') === getTodayYmd();
    } catch {
      return false;
    }
  });

  // Real today's meetings for top Schedule Alert bar (Requirement 3: always active in real-time)
  const todayMeetings = useMemo(() => {
    return getMergedEvents(activeMeetings, todayKey);
  }, [activeMeetings, customEvents, todayKey]);

  const todayRoastResult: CalendarRoastResult = useMemo(() => {
    return analyzeCalendarEvents(todayMeetings, activePresetId || undefined, 0, new Date());
  }, [todayMeetings, activePresetId]);

  const isEmbedMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('embed') === '1';
  }, []);

  // Keyboard shortcut: Shift+A or Shift+D to open Admin Console (or Password Modal if locked)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'D' || e.key === 'd')) {
        if (isAdminAuthed) {
          setIsAdminConsoleOpen((prev) => !prev);
        } else {
          setIsAdminPasswordModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminAuthed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // ignore
    }
  }, [persisted]);

  const showToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2800);
  };

  // Enforce Free Tier Character Gating: if free, prevent selecting locked characters
  useEffect(() => {
    if (!isPro && !isAdmin && (persisted.selectedTheme === 'capybara' || persisted.selectedTheme === 'ghost')) {
      setPersisted((prev) => ({ ...prev, selectedTheme: 'all' }));
    }
  }, [isPro, isAdmin, persisted.selectedTheme]);

  // Reset cycle index whenever date offset changes
  useEffect(() => {
    setSpecialQuoteCycleIndex(0);
  }, [persisted.dateOffset]);

  // Integrated useTodayQuote hook with quotes365.json dataset
  const {
    currentQuote,
    nextQuotePreview,
    isToday,
    isPastDate,
    isFutureDate,
    isBirthday,
    canGoNext,
    canGoPrev,
    specialEventResult,
  } = useTodayQuote({
    dateOffset: persisted.dateOffset,
    isPro,
    isAdmin,
    allowFutureDates,
    calendarConnected: persisted.calendarConnected,
    roastResult: persisted.calendarConnected ? roastResult : null,
    selectedThemeFilter: persisted.selectedTheme,
    birthday: persisted.birthday || null,
    calendarEvents: effectiveMeetings,
    specialQuoteCycleIndex,
    activePresetId: activePresetId || undefined,
    userCardMode: currentCardViewMode,
  });

  // Today's quote strictly locked for Native Widgets to prevent future/past date spoilers
  const { currentQuote: todayQuoteToSync } = useTodayQuote({
    dateOffset: 0,
    isPro,
    isAdmin,
    allowFutureDates: false,
    calendarConnected: persisted.calendarConnected,
    roastResult: persisted.calendarConnected ? todayRoastResult : null,
    selectedThemeFilter: persisted.selectedTheme,
    birthday: persisted.birthday || null,
    calendarEvents: todayMeetings,
    specialQuoteCycleIndex,
    activePresetId: activePresetId || undefined,
    userCardMode: cardViewModeMap[todayKey],
  });

  // Ensure if dateOffset is 0 (viewing Today), Today is marked unlocked in localStorage
  useEffect(() => {
    if (persisted.dateOffset === 0 && !isTodayUnlocked) {
      try {
        localStorage.setItem('last_torn_to_date', todayKey);
      } catch {}
      setIsTodayUnlocked(true);
    }
  }, [persisted.dateOffset, isTodayUnlocked, todayKey]);

  const syncAllCalendarSources = async (): Promise<CalendarMeeting[]> => {
    setIsCalendarSyncing(true);
    try {
      const isNative =
        typeof window !== 'undefined' &&
        (window as any).Capacitor &&
        (window as any).Capacitor.isNativePlatform();

      const results: CalendarMeeting[] = [];
      const seenKeys = new Set<string>();

      const addEvents = (list: CalendarMeeting[]) => {
        for (const ev of list) {
          const key = `${ev.dateKey || ''}_${ev.title}_${ev.startHour}_${ev.startMinute}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            results.push(ev);
          }
        }
      };

      // 1. Fetch native device calendars on mobile APK
      if (isNative) {
        try {
          const nativeEvents = await fetchNativeDeviceCalendarEvents();
          addEvents(nativeEvents);
        } catch (e) {
          console.warn('Native calendar sync warning:', e);
        }
      }

      // 2. Fetch saved live calendar feed URL (iCal / webcal / GAS)
      const savedLiveUrl = localStorage.getItem('live_calendar_url');
      if (savedLiveUrl && savedLiveUrl.trim()) {
        try {
          const feedEvents = await fetchLiveCalendarFeed(savedLiveUrl.trim());
          addEvents(feedEvents);
        } catch (e) {
          console.warn('Live feed sync warning:', e);
        }
      }

      if (results.length > 0) {
        setActiveMeetings(results);
        setActivePresetId(null);
        try {
          localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(results));
        } catch {
          // ignore
        }
        setPersisted((prev) => ({ ...prev, calendarConnected: true }));
      }
      return results;
    } finally {
      setIsCalendarSyncing(false);
    }
  };

  const handleForceCalendarResync = async () => {
    showToast('🔄 正在一鍵強制重新同步行事曆...');
    try {
      const results = await syncAllCalendarSources();
      if (results.length > 0) {
        showToast(`✅ 行事曆重新同步完成！共載入 ${results.length} 場行程。`);
      } else {
        showToast('⚠️ 未偵測到行程，請確認已授權手機日曆或已設定訂閱網址。');
      }
    } catch (err: any) {
      showToast(`❌ 同步失敗: ${err?.message || '請稍候再試'}`);
    }
  };

  const handleRemoveCalendarSync = () => {
    setActiveMeetings([]);
    setActivePresetId(null);
    try {
      localStorage.removeItem('ganhua_calendar_meetings');
      localStorage.removeItem('ganhua_active_preset_id');
      localStorage.removeItem('live_calendar_url');
      localStorage.removeItem('ganhua_enabled_calendar_ids');
    } catch {
      // ignore
    }
    cancelAllCalendarRemindersViaBridge();
    clearSyncedEventCustomizations();
    setPersisted((prev) => ({ ...prev, calendarConnected: false }));
    showToast('✕ 已完全解除行事曆連動，恢復每日常規 365 幹話！');
  };

  // Check for OTA Remote Content Updates in background on app start
  useEffect(() => {
    contentSyncService.checkForUpdates().then((res) => {
      if (res.updated) {
        showToast(`✨ 日曆內容已自動更新至最新版本 (v${res.version})！`);
      }
    });

    // Auto-sync calendar events on app start if calendar connected
    if (persisted.calendarConnected) {
      syncAllCalendarSources().catch(() => {});
    }
  }, []);

  // Confetti celebration if today is user's birthday
  useEffect(() => {
    if (isBirthday && isToday) {
      fireConfetti({
        particleCount: 80,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#C83E31', '#D4B483', '#FAF7F0', '#E58C8A'],
      });
    }
  }, [isBirthday, isToday]);

  // Sync to native Android widget strictly using today's quote (preventing future spoilers)
  useEffect(() => {
    const quoteToSync = todayQuoteToSync || (persisted.dateOffset === 0 ? currentQuote : null);
    if (quoteToSync) {
      syncNativeWidgetData(
        quoteToSync,
        persisted.streakCount,
        persisted.offWorkHour,
        persisted.survivedDates,
        todayMeetings,
        allAppointments
      );
    }
  }, [
    todayQuoteToSync,
    currentQuote,
    persisted.dateOffset,
    persisted.streakCount,
    persisted.offWorkHour,
    persisted.survivedDates,
    todayMeetings,
    allAppointments,
  ]);

  // Schedule native event alarms only when appointments or notification settings change
  const lastSyncedRemindersHashRef = useRef<string>('');
  useEffect(() => {
    const eventsToNotify = (allAppointments || []).filter(
      (a) => a.source === 'local' || persisted.calendarConnected
    );

    if (eventsToNotify.length === 0) {
      lastSyncedRemindersHashRef.current = '';
      cancelAllCalendarRemindersViaBridge();
      return;
    }

    const fingerprint = eventsToNotify
      .map(
        (a) =>
          `${a.id}:${a.dateKey}:${a.startHour}:${a.startMinute}:${Boolean(a.notificationsDisabled)}:${JSON.stringify(a.reminders || [])}`
      )
      .join('|');

    if (fingerprint !== lastSyncedRemindersHashRef.current) {
      lastSyncedRemindersHashRef.current = fingerprint;
      syncAllCalendarRemindersViaBridge(eventsToNotify);
    }
  }, [persisted.calendarConnected, allAppointments]);

  // Handlers for Backward Navigation
  const handlePrevDay = () => {
    if (!canGoPrev) {
      if (!isPro && !isAdmin) {
        setIsPaywallOpen(true);
      } else {
        showToast('已翻閱至最久遠的生存存檔紀錄。');
      }
      return;
    }
    playPaperTearSound();
    setPersisted((prev) => ({
      ...prev,
      dateOffset: prev.dateOffset - 1,
    }));
  };

  const handleNextDay = () => {
    if (canGoNext) {
      const nextOffset = persisted.dateOffset + 1;
      playPaperTearSound();

      // The Moment the User Tears Forward and Reaches today (nextOffset === 0)
      if (nextOffset === 0 && !isTodayUnlocked) {
        try {
          localStorage.setItem('last_torn_to_date', todayKey);
        } catch {}
        setIsTodayUnlocked(true);

        // Haptic vibration feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([40, 60, 40]);
          } catch {}
        }

        // Confetti celebration
        fireConfetti({
          particleCount: 70,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#C83E31', '#D4B483', '#2D2D2D', '#FAF7F0'],
        });

        showToast('🎉 新的一天正式解鎖！今日幹話已揭曉');
      }

      setPersisted((prev) => ({
        ...prev,
        dateOffset: nextOffset,
      }));
    } else {
      handleBlockedTomorrow();
    }
  };

  const handleBlockedTomorrow = () => {
    if (isAdmin) {
      showToast('🔒 明天的事明天再煩惱；您亦可至管理員控制台開啟「解除未來鎖定」提前預覽。');
    } else {
      showToast('🔮 明天的幹話還在封印中，先活過今天吧！');
    }
  };

  const handleOpenAddEvent = (dateStr?: string) => {
    setAddEventInitialDate(dateStr || currentDateKey);
    setEditingCustomEvent(null);
    setIsAddEventModalOpen(true);
  };

  const handleEditMeeting = (meeting: CalendarMeeting) => {
    const found = customEvents.find((e) => e.id === meeting.id);
    if (found) {
      setEditingCustomEvent(found);
      setAddEventInitialDate(found.dateKey);
      setIsAddEventModalOpen(true);
    } else {
      // Populate modal from synced / preset meeting so user can edit notification times, details, or delete
      const editable: CustomCalendarEvent = {
        id: meeting.id,
        title: meeting.title,
        dateKey: meeting.dateKey || currentDateKey,
        startHour: meeting.startHour,
        startMinute: meeting.startMinute,
        durationMinutes: meeting.durationMinutes,
        isAllDay: Boolean(meeting.isAllDay),
        notes: meeting.notes,
        location: meeting.location,
        source: meeting.source || 'synced',
        calendarName: meeting.calendarName,
        calendarColor: meeting.calendarColor,
        reminders: meeting.reminders,
        notificationsDisabled: meeting.notificationsDisabled,
      };
      setEditingCustomEvent(editable);
      setAddEventInitialDate(editable.dateKey);
      setIsAddEventModalOpen(true);
    }
  };

  const handleSaveCustomEvent = async (
    newEvent: CustomCalendarEvent,
    targetCalendarId?: string
  ) => {
    const isSynced = newEvent.source && newEvent.source !== 'local';

    if (isSynced) {
      // Persist synced event override (reminders, notificationsDisabled, time, title, notes, etc.)
      saveSyncedEventOverride(newEvent.id, {
        title: newEvent.title,
        dateKey: newEvent.dateKey,
        startHour: newEvent.startHour,
        startMinute: newEvent.startMinute,
        durationMinutes: newEvent.durationMinutes,
        isAllDay: newEvent.isAllDay,
        location: newEvent.location,
        notes: newEvent.notes,
        reminders: newEvent.reminders,
        notificationsDisabled: newEvent.notificationsDisabled,
      });

      setActiveMeetings((prev) => {
        const updated = prev.map((m) =>
          m.id === newEvent.id
            ? {
                ...m,
                ...newEvent,
              }
            : m
        );
        try {
          localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Immediately update native Android AlarmManager for this event
      scheduleEventNotificationsViaBridge(newEvent);
      showToast(
        newEvent.notificationsDisabled
          ? `🔕 已關閉「${newEvent.title}」的提醒通知`
          : `🔔 已更新「${newEvent.title}」的通知與行程設定！`
      );
      return;
    }

    const [y, m, d] = newEvent.dateKey.split('-').map(Number);
    const sDate = new Date(
      y,
      (m || 1) - 1,
      d || 1,
      newEvent.isAllDay ? 0 : newEvent.startHour,
      newEvent.isAllDay ? 0 : newEvent.startMinute
    );
    const eDate = newEvent.isAllDay
      ? new Date(y, (m || 1) - 1, d || 1, 23, 59, 59)
      : new Date(sDate.getTime() + newEvent.durationMinutes * 60 * 1000);

    // 1. If user chose a writable Google / Android calendar, write directly via AndroidCalendarBridge
    if (targetCalendarId && targetCalendarId !== 'local') {
      try {
        localStorage.setItem('default_write_calendar_id', targetCalendarId);
      } catch {}

      const created = createAndroidCalendarEvent({
        calendarId: targetCalendarId,
        title: newEvent.title,
        startMs: sDate.getTime(),
        endMs: eDate.getTime(),
        isAllDay: newEvent.isAllDay,
        notes: newEvent.notes,
        reminders: newEvent.notificationsDisabled ? [] : newEvent.reminders,
      });

      if (created.eventId > 0) {
        const synced = await syncAllCalendarSources();
        const matched = synced.find((ev) => ev.eventId === created.eventId);
        if (matched) {
          saveSyncedEventOverride(matched.id, {
            reminders: newEvent.reminders,
            notificationsDisabled: newEvent.notificationsDisabled,
          });
          scheduleEventNotificationsViaBridge({
            ...matched,
            reminders: newEvent.reminders,
            notificationsDisabled: newEvent.notificationsDisabled,
          });
        }
        showToast(
          `✨ 行程「${newEvent.title}」已同步寫入 ${newEvent.calendarName || 'Google 行事曆'}！`
        );
        return;
      }

      if (created.missingPermission) {
        saveCustomEvent(newEvent);
        setCustomEvents(getCustomEvents());
        showToast('📅 請先授予「行事曆寫入」權限，已先暫存於幹話日曆本機');
        return;
      }
    }

    // 2. Local-only save (or web fallback)
    saveCustomEvent(newEvent);
    setCustomEvents(getCustomEvents());

    if (!targetCalendarId) {
      writeNativeDeviceCalendarEvent({
        title: newEvent.title,
        startDate: sDate,
        endDate: eDate,
        isAllDay: newEvent.isAllDay,
        notes: newEvent.notes,
      }).catch(() => {});
    }

    // 3. Google Apps Script Push (Two-way web bridge)
    pushEventToGoogleAppsScript(newEvent).catch(() => {});

    showToast(`✨ 行程「${newEvent.title}」已儲存！已即時連動專屬幹話`);
  };

  const handleDeleteCustomEvent = (
    eventId: string,
    eventObj?: CustomCalendarEvent | CalendarMeeting
  ) => {
    const target: CalendarMeeting =
      (eventObj as CalendarMeeting) ||
      allAppointments.find((m) => m.id === eventId) || {
        id: eventId,
        title: '此行程',
        startHour: 9,
        startMinute: 0,
        durationMinutes: 60,
        source: customEvents.some((e) => e.id === eventId) ? 'local' : 'synced',
      };
    setPendingDeleteEvent(target);
  };

  const handleConfirmDeleteLocal = (evt: CalendarMeeting) => {
    deleteCustomEvent(evt.id);
    setCustomEvents(getCustomEvents());
    deleteNativeDeviceCalendarEvent(evt.id).catch(() => {});
    cancelEventNotificationsViaBridge(evt.id);
    setPendingDeleteEvent(null);
    showToast('🗑️ 行程已成功刪除');
  };

  const handleConfirmHideSynced = (evt: CalendarMeeting) => {
    hideSyncedEvent(evt.id);
    setActiveMeetings((prev) => {
      const next = prev.filter((m) => m.id !== evt.id);
      try {
        localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(next));
      } catch {}
      return next;
    });
    cancelEventNotificationsViaBridge(evt.id);
    setPendingDeleteEvent(null);
    showToast('🙈 已僅在幹話日曆隱藏此行程');
  };

  const handleConfirmDeleteGoogle = (evt: CalendarMeeting) => {
    if (!evt.eventId || evt.eventId <= 0) {
      handleConfirmHideSynced(evt);
      return;
    }

    const result = deleteAndroidCalendarEventById(evt.eventId);
    if (result.missingPermission) {
      showToast('📅 請先允許「行事曆寫入」權限，再點擊一次刪除');
      return;
    }

    if (result.success) {
      const removedIds: string[] = [];
      setActiveMeetings((prev) => {
        const next = prev.filter((m) => {
          const isMatch = m.id === evt.id || (m.eventId && m.eventId === evt.eventId);
          if (isMatch) removedIds.push(m.id);
          return !isMatch;
        });
        try {
          localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(next));
        } catch {}
        return next;
      });
      removedIds.forEach((id) => cancelEventNotificationsViaBridge(id));
      cancelEventNotificationsViaBridge(evt.id);
      setPendingDeleteEvent(null);
      showToast('🗑️ 已同步從 Google 行事曆刪除此行程');
    } else {
      showToast('⚠️ 無法從系統日曆刪除，可改用「僅在幹話日曆隱藏」');
    }
  };

  const handleJumpToDate = (targetDate: Date) => {
    const t = new Date();
    const todayMidnight = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffDays = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / 86400000);
    const currentTodayKey = getTodayYmd();
    const unlocked = localStorage.getItem('last_torn_to_date') === currentTodayKey;

    if (diffDays === 0) {
      if (!unlocked) {
        // Today is not unlocked yet: route to yesterday so the user gets to tear it off!
        setPersisted((prev) => ({
          ...prev,
          dateOffset: -1,
        }));
        showToast('✂️ 請親手撕下昨日日曆，正式開啟今天！');
        return;
      }
      setPersisted((prev) => ({
        ...prev,
        dateOffset: 0,
      }));
      showToast('已返回今日日曆！');
      return;
    }

    setPersisted((prev) => ({
      ...prev,
      dateOffset: diffDays,
    }));
    if (diffDays > 0) {
      showToast('🔮 已檢視未來預排行程，幹話將於當日 00:00 解鎖！');
    } else {
      showToast(`已翻閱至歷史存檔 (${targetDate.getMonth() + 1}/${targetDate.getDate()})`);
    }
  };

  // Listen for native Android widget date selection deep-link & 1x1 Survival Stamp sync
  useEffect(() => {
    const handleWidgetDateEvent = (e: any) => {
      const dateStr = e.detail;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        if (y && m && d) {
          handleJumpToDate(new Date(y, m - 1, d));
        }
      }
    };
    window.addEventListener('widgetSelectDate', handleWidgetDateEvent);

    const handleWidgetSurvivedSync = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const { survivedDates, streakCount } = detail;
      if (Array.isArray(survivedDates)) {
        setPersisted((prev) => {
          const merged = Array.from(new Set([...prev.survivedDates, ...survivedDates]));
          return {
            ...prev,
            survivedDates: merged,
            streakCount:
              typeof streakCount === 'number' && streakCount > prev.streakCount
                ? streakCount
                : prev.streakCount,
          };
        });
        showToast('💮 已同步桌面小工具的今日生還打卡！');
      }
    };
    window.addEventListener('widgetSurvivedSync', handleWidgetSurvivedSync);

    // Read pending widget date from native Capacitor plugin if cold-started
    const syncFromNativeWidgets = () => {
      const win = window as any;
      if (win.Capacitor?.Plugins?.GanhuaWidgetBridge?.getPendingWidgetDate) {
        win.Capacitor.Plugins.GanhuaWidgetBridge.getPendingWidgetDate().then((res: any) => {
          if (res?.date && /^\d{4}-\d{2}-\d{2}$/.test(res.date)) {
            const [y, m, d] = res.date.split('-').map(Number);
            if (y && m && d) {
              handleJumpToDate(new Date(y, m - 1, d));
            }
          }
        }).catch(() => {});
      }

      // Read pending 1x1 / 4x5 widget survival stamps
      if (win.Capacitor?.Plugins?.GanhuaWidgetBridge?.getPendingSurvivedSync) {
        win.Capacitor.Plugins.GanhuaWidgetBridge.getPendingSurvivedSync().then((res: any) => {
          if (res?.hasPending && res?.survivedDatesJson) {
            try {
              const list = JSON.parse(res.survivedDatesJson);
              if (Array.isArray(list) && list.length > 0) {
                setPersisted((prev) => ({
                  ...prev,
                  survivedDates: Array.from(new Set([...prev.survivedDates, ...list])),
                  streakCount:
                    typeof res.streakCount === 'number' && res.streakCount > prev.streakCount
                      ? res.streakCount
                      : prev.streakCount,
                }));
              }
            } catch {}
          }
        }).catch(() => {});
      }

      // Read pending torn status from 4x5 Desk Card Widget
      if (win.Capacitor?.Plugins?.GanhuaWidgetBridge?.getPendingTornSync) {
        win.Capacitor.Plugins.GanhuaWidgetBridge.getPendingTornSync().then((res: any) => {
          if (res?.lastTornToDate) {
            try {
              localStorage.setItem('last_torn_to_date', res.lastTornToDate);
              const curTodayKey = toLocalDateKey(new Date());
              if (res.lastTornToDate === curTodayKey) {
                setIsTodayUnlocked(true);
                setPersisted((prev) => (prev.dateOffset < 0 ? { ...prev, dateOffset: 0 } : prev));
              }
            } catch {}
          }
        }).catch(() => {});
      }
    };

    syncFromNativeWidgets();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncFromNativeWidgets();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Check URL parameters (?select_date=YYYY-MM-DD)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get('select_date') || params.get('jumpToYmd');
      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        const [y, m, d] = urlDate.split('-').map(Number);
        if (y && m && d) {
          handleJumpToDate(new Date(y, m - 1, d));
        }
      }
    }

    return () => {
      window.removeEventListener('widgetSelectDate', handleWidgetDateEvent);
      window.removeEventListener('widgetSurvivedSync', handleWidgetSurvivedSync);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  const handleBackToToday = () => {
    const currentTodayKey = getTodayYmd();
    const unlocked = localStorage.getItem('last_torn_to_date') === currentTodayKey;
    if (!unlocked) {
      // If Today is NOT unlocked yet, route to yesterday so the user gets to tear it off
      setPersisted((prev) => ({ ...prev, dateOffset: -1 }));
      showToast('✂️ 請親手撕下昨日日曆，正式開啟今天！');
    } else {
      setPersisted((prev) => ({ ...prev, dateOffset: 0 }));
      showToast('已返回今日日曆！');
    }
  };

  // Stamp Survived
  const handleStampSurvived = () => {
    playStampSound();
    const alreadyStamped = persisted.survivedDates.includes(currentQuote.date);

    if (!alreadyStamped) {
      fireConfetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.7 },
        colors: ['#C83E31', '#D4B483', '#2D2D2D'],
      });
      setPersisted((prev) => ({
        ...prev,
        survivedDates: [...prev.survivedDates, currentQuote.date],
        streakCount: prev.streakCount + 1,
      }));
      showToast('💮 蓋章成功！今日已平安生還，連續打卡 +1 天！');
    } else {
      setPersisted((prev) => ({
        ...prev,
        survivedDates: prev.survivedDates.filter((d) => d !== currentQuote.date),
        streakCount: Math.max(0, prev.streakCount - 1),
      }));
      showToast('已取消此日生還印章');
    }
  };

  const handleToggleFavorite = (quoteId: string) => {
    setPersisted((prev) => {
      const exists = prev.favoritedIds.includes(quoteId);
      const nextFavs = exists
        ? prev.favoritedIds.filter((id) => id !== quoteId)
        : [...prev.favoritedIds, quoteId];
      return {
        ...prev,
        favoritedIds: nextFavs,
      };
    });
  };

  // Standalone Notion embed mode
  if (isEmbedMode) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4">
        <DeskCalendar
          quote={currentQuote}
          nextQuotePreview={nextQuotePreview}
          artStyle={persisted.artStyle}
          isSurvivedToday={persisted.survivedDates.includes(currentQuote.date)}
          isPastDate={isPastDate}
          isFutureDate={isFutureDate}
          canGoNext={canGoNext}
          canGoPrev={canGoPrev}
          onTearOff={handleNextDay}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          isFavorited={persisted.favoritedIds.includes(currentQuote.id)}
          onToggleFavorite={handleToggleFavorite}
          onBlockedTomorrow={handleBlockedTomorrow}
          onOpenMonthlyCalendar={() => setIsMonthlyCalendarOpen(true)}
          onCycleSpecialQuote={() => setSpecialQuoteCycleIndex((prev) => prev + 1)}
          isTodayUnlocked={isTodayUnlocked}
        />
      </div>
    );
  }

  return (
    <div
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      className="min-h-screen bg-[#F9F6F0] text-[#2D2D2D] flex flex-col justify-between pb-12"
    >
      {/* 1. Top Bar */}
      <TopBar
        selectedTheme={persisted.selectedTheme}
        onSelectTheme={(theme) => {
          if (!isPro && !isAdmin && (theme === 'capybara' || theme === 'ghost' || theme === 'all')) {
            setIsPaywallOpen(true);
            return;
          }
          setPersisted((prev) => ({ ...prev, selectedTheme: theme }));
        }}
        streakCount={persisted.streakCount}
        offWorkHour={persisted.offWorkHour}
        onChangeOffWorkHour={(hr) => setPersisted((prev) => ({ ...prev, offWorkHour: hr }))}
        artStyle={persisted.artStyle}
        onToggleArtStyle={() =>
          setPersisted((prev) => ({
            ...prev,
            artStyle: prev.artStyle === 'original' ? 'svg' : 'original',
          }))
        }
        favoritesCount={persisted.favoritedIds.length}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
        isPro={isPro}
        isFreeTrialActive={isFreeTrialActive}
        trialDaysRemaining={trialDaysRemaining}
        trialDaysTotal={trialDaysTotal}
        isPaidPro={isPaidPro}
        currentTier={tier}
        isAdminAuthed={isAdminAuthed}
        birthday={persisted.birthday || null}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onOpenAdminConsole={() => setIsAdminConsoleOpen(true)}
        onRequestPasswordAuth={() => setIsAdminPasswordModalOpen(true)}
        onOpenBirthdayModal={() => setIsBirthdayModalOpen(true)}
      />

      {/* Toast Alert */}
      {toastText && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto z-40 max-w-sm mx-auto rounded-2xl bg-[#2D2D2D] text-[#F9F6F0] px-4 py-3 text-xs font-sans font-bold shadow-xl flex items-center gap-2 border border-[#D4B483]/40 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-[#D4B483] shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto px-4 pt-2 space-y-3">
        {/* A. Calendar Sync Module (Roast Engine - Requirement 3: always active in real-time) */}
        <CalendarSyncBar
          isPro={isPro || isAdmin}
          isConnected={persisted.calendarConnected}
          roastResult={persisted.calendarConnected ? todayRoastResult : null}
          isSyncing={isCalendarSyncing}
          onOpenSyncModal={() => setIsCalendarSyncModalOpen(true)}
          onOpenPaywall={() => setIsPaywallOpen(true)}
          onToggleConnected={(connected) => {
            setPersisted((prev) => ({ ...prev, calendarConnected: connected }));
          }}
          onForceResync={handleForceCalendarResync}
          onRemoveSync={handleRemoveCalendarSync}
          onOpenAddEvent={() => handleOpenAddEvent(currentQuote?.date)}
        />

        {/* B. Center Stage: Desk Calendar Card */}
        {/* Quick Return to Today Floating Banner when viewing future or past date */}
            {persisted.dateOffset !== 0 && (
              <div className="max-w-[390px] mx-auto flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#2D2D2D] text-[#F9F6F0] border border-[#D4B483] shadow-lg animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {isFutureDate
                      ? '🔮'
                      : !isTodayUnlocked && persisted.dateOffset === -1
                      ? '✨'
                      : '📜'}
                  </span>
                  <span className="text-xs font-sans font-bold">
                    {isFutureDate
                      ? `未來預約日程：${currentDateObj.getMonth() + 1}月${currentDateObj.getDate()}日`
                      : !isTodayUnlocked && persisted.dateOffset === -1
                      ? '昨日日曆・等待撕頁解鎖今日'
                      : `歷史存檔：${currentDateObj.getMonth() + 1}月${currentDateObj.getDate()}日`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={!isTodayUnlocked && persisted.dateOffset === -1 ? handleNextDay : handleBackToToday}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#D4B483] hover:bg-[#c2a270] text-[#2D2D2D] text-xs font-sans font-black transition active:scale-95 cursor-pointer shadow-xs"
                >
                  {!isTodayUnlocked && persisted.dateOffset === -1 ? (
                    <>
                      <Scissors className="w-3.5 h-3.5 text-[#2D2D2D]" />
                      <span>撕下解鎖今日</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>返回今日</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <DeskCalendar
              quote={currentQuote}
              nextQuotePreview={nextQuotePreview}
              artStyle={persisted.artStyle}
              isSurvivedToday={persisted.survivedDates.includes(currentQuote.date)}
              isPastDate={isPastDate}
              isFutureDate={isFutureDate}
              canGoNext={canGoNext}
              canGoPrev={canGoPrev}
              onTearOff={handleNextDay}
              onPrevDay={handlePrevDay}
              onNextDay={handleNextDay}
              isFavorited={persisted.favoritedIds.includes(currentQuote.id)}
              onToggleFavorite={handleToggleFavorite}
              onBlockedTomorrow={handleBlockedTomorrow}
              onOpenMonthlyCalendar={() => setIsMonthlyCalendarOpen(true)}
              onCycleSpecialQuote={() => setSpecialQuoteCycleIndex((prev) => prev + 1)}
              onBackToToday={handleBackToToday}
              onShowToast={showToast}
              isTodayUnlocked={isTodayUnlocked}
              onToggleRoastMode={() => {
                const currentMode = currentQuote?.currentMode || (currentQuote?.hasRoastOverride ? 'roast' : 'original');
                const nextMode = currentMode === 'roast' ? 'original' : 'roast';
                setCardViewModeMap((prev) => ({
                  ...prev,
                  [currentDateKey]: nextMode,
                }));
                showToast(nextMode === 'original' ? '已換回每日原創幹話' : '已切換為行程專屬吐槽');
              }}
            />

            {/* Daily Agenda & Sarcastic Timeline Strip */}
            <DailyAgendaStrip
              events={effectiveMeetings}
              allEvents={allAppointments}
              currentDateKey={currentQuote?.date || todayKey}
              todayDateKey={todayKey}
              isFuture={isFutureDate}
              onOpenSyncModal={() => setIsCalendarSyncModalOpen(true)}
              onOpenAddEvent={(targetDateKey) => handleOpenAddEvent(targetDateKey || currentQuote?.date)}
              onEditEvent={handleEditMeeting}
              onDeleteEvent={(evt) => handleDeleteCustomEvent(evt.id, evt)}
              onShowToast={showToast}
            />

        {/* C. 3-Logo Horizontal Action Dock */}
        <div className="max-w-md w-full mx-auto grid grid-cols-3 gap-3 sm:gap-4 my-3 p-3 rounded-2xl bg-[#F9F6F0] border border-[#2D2D2D]/15 shadow-sm select-none">
          {/* Button 1 (Left — 蓋章打卡 / 今日已生還) */}
          <button
            type="button"
            onClick={handleStampSurvived}
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform cursor-pointer"
          >
            <div
              className={`w-20 h-20 rounded-2xl shadow-sm border border-[#2D2D2D]/15 overflow-hidden relative transition-all ${
                persisted.survivedDates.includes(currentQuote.date)
                  ? 'ring-2 ring-[#C83E31] shadow-md'
                  : 'group-hover:border-[#2D2D2D]/30'
              }`}
            >
              <img
                src="/assets/icons/action_icon_survived.png"
                alt="今日已生還"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              {persisted.survivedDates.includes(currentQuote.date) && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-[#C83E31] text-[#FAF7F0] text-[9px] font-sans font-black shadow-xs flex items-center gap-0.5 animate-in fade-in zoom-in duration-150">
                  <span>✓ 已蓋章</span>
                </div>
              )}
            </div>
            <span className="font-sans font-bold text-xs text-[#2D2D2D] group-hover:text-[#C83E31] transition-colors truncate max-w-full">
              {persisted.survivedDates.includes(currentQuote.date) ? '今日已生還' : '點擊蓋章生還'}
            </span>
          </button>

          {/* Button 2 (Center — 分享 IG 限動) */}
          <button
            type="button"
            onClick={() => setIsIgModalOpen(true)}
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform cursor-pointer"
          >
            <div
              className="w-20 h-20 rounded-2xl shadow-sm border border-[#2D2D2D]/15 overflow-hidden transition-all group-hover:border-[#2D2D2D]/30"
            >
              <img
                src="/assets/icons/action_icon_ig.png"
                alt="分享 IG 限動"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>
            <span className="font-sans font-bold text-xs text-[#2D2D2D] group-hover:text-[#C83E31] transition-colors truncate max-w-full">
              分享 IG 限動
            </span>
          </button>

          {/* Button 3 (Right — 生還月曆總覽) */}
          <button
            type="button"
            onClick={() => setIsMonthlyCalendarOpen(true)}
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform cursor-pointer"
          >
            <div
              className="w-20 h-20 rounded-2xl shadow-sm border border-[#2D2D2D]/15 overflow-hidden transition-all group-hover:border-[#2D2D2D]/30"
            >
              <img
                src="/assets/icons/action_icon_calendar.png"
                alt="生還月曆"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>
            <span className="font-sans font-bold text-xs text-[#2D2D2D] group-hover:text-[#C83E31] transition-colors truncate max-w-full">
              生還月曆 ({persisted.streakCount}天)
            </span>
          </button>
        </div>
      </main>

      {/* IG Story Modal */}
      <IgStoryModal
        isOpen={isIgModalOpen}
        onClose={() => setIsIgModalOpen(false)}
        quote={currentQuote}
        isSurvivedToday={persisted.survivedDates.includes(currentQuote.date)}
        streakCount={persisted.streakCount}
        artStyle={persisted.artStyle}
        isPro={isPro}
        onOpenPaywall={() => {
          setIsIgModalOpen(false);
          setIsPaywallOpen(true);
        }}
        onShowToast={showToast}
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onPurchase={purchase}
        onRestore={restore}
        isLoading={isSubLoading}
        isPro={isPro}
        isFreeTrialActive={isFreeTrialActive}
        trialDaysRemaining={trialDaysRemaining}
        trialDaysTotal={trialDaysTotal}
        isPaidPro={isPaidPro}
        onRestoreWithCode={restoreWithTransferId}
        onToggleMockPro={toggleMockPro}
      />

      {/* Calendar Sync & Roast Settings Modal */}
      <CalendarSyncModal
        isOpen={isCalendarSyncModalOpen}
        onClose={() => setIsCalendarSyncModalOpen(false)}
        isConnected={persisted.calendarConnected}
        activeMeetings={activeMeetings}
        activePresetId={activePresetId}
        isSyncing={isCalendarSyncing}
        onForceResync={handleForceCalendarResync}
        onRemoveSync={handleRemoveCalendarSync}
        onUpdateMeetings={(meetings, presetId = null) => {
          setActiveMeetings(meetings);
          setActivePresetId(presetId);
          try {
            localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(meetings));
            if (presetId) {
              localStorage.setItem('ganhua_active_preset_id', presetId);
            } else {
              localStorage.removeItem('ganhua_active_preset_id');
            }
          } catch {
            // ignore
          }
        }}
        onToggleConnected={(connected) => {
          setPersisted((prev) => ({ ...prev, calendarConnected: connected }));
        }}
        isPro={isPro || isAdmin}
        onOpenPaywall={() => {
          setIsCalendarSyncModalOpen(false);
          setIsPaywallOpen(true);
        }}
        onUnlockDevMode={() => {
          setIsDevModeUnlocked(true);
          try {
            localStorage.setItem('ganhua_dev_mode_unlocked', 'true');
          } catch {}
          showToast('🛠️ 已啟用開發者模式！底部工具列已顯示');
        }}
      />

      {/* Monthly Desk Calendar Modal */}
      <MonthlyCalendarModal
        isOpen={isMonthlyCalendarOpen}
        onClose={() => setIsMonthlyCalendarOpen(false)}
        currentDate={currentDateObj}
        today={new Date()}
        survivedDates={persisted.survivedDates || []}
        allEvents={allAppointments}
        activeMeetings={allAppointments}
        customEvents={customEvents}
        quotes={contentSyncService.getQuotes365()}
        onSelectDate={handleJumpToDate}
        onOpenAddEvent={(dateStr) => handleOpenAddEvent(dateStr)}
        onEditEvent={handleEditMeeting}
        onDeleteEvent={(evt) => handleDeleteCustomEvent(evt.id, evt)}
        onShowToast={showToast}
        isTodayUnlocked={isTodayUnlocked}
      />

      {/* Add / Edit Appointment Modal */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => {
          setIsAddEventModalOpen(false);
          setEditingCustomEvent(null);
        }}
        initialDate={addEventInitialDate || currentQuote?.date}
        editingEvent={editingCustomEvent}
        onSave={handleSaveCustomEvent}
        onDelete={handleDeleteCustomEvent}
      />

      {/* Safe Two-Way Delete Confirmation Modal */}
      <DeleteEventConfirmModal
        event={pendingDeleteEvent}
        isLocalCustom={Boolean(
          pendingDeleteEvent &&
            (customEvents.some((e) => e.id === pendingDeleteEvent.id) ||
              pendingDeleteEvent.source === 'local')
        )}
        onClose={() => setPendingDeleteEvent(null)}
        onDeleteLocal={handleConfirmDeleteLocal}
        onHideInApp={handleConfirmHideSynced}
        onDeleteFromGoogle={handleConfirmDeleteGoogle}
      />

      {/* Floating Version Quick-Switcher (Only visible when dev mode unlocked via 7-tap) */}
      {isDevModeUnlocked && (
        <FloatingVersionBar
          currentTier={tier}
          isAdminAuthed={isAdminAuthed}
          onChangeTier={(newTier) => {
            const success = setTier(newTier);
            if (success) {
              showToast(`已切換為【${newTier === 'admin' ? '👑 管理員模式' : newTier === 'pro' ? 'PRO 專業版' : '免費體驗版'}】視角！`);
            } else {
              setIsAdminPasswordModalOpen(true);
            }
          }}
          onOpenAdminConsole={() => setIsAdminConsoleOpen(true)}
          onRequestPasswordAuth={() => setIsAdminPasswordModalOpen(true)}
          onLockDevMode={() => {
            setIsDevModeUnlocked(false);
            try {
              localStorage.removeItem('ganhua_dev_mode_unlocked');
            } catch {}
            showToast('🔒 開發者模式已關閉');
          }}
        />
      )}

      {/* Admin Console & Time Machine Modal */}
      <AdminConsoleModal
        isOpen={isAdminConsoleOpen}
        onClose={() => setIsAdminConsoleOpen(false)}
        currentTier={tier}
        onChangeTier={(newTier) => {
          const success = setTier(newTier);
          if (success) {
            showToast(`已切換為【${newTier === 'admin' ? '👑 管理員模式' : newTier === 'pro' ? 'PRO 專業版' : '免費體驗版'}】視角！`);
          } else {
            setIsAdminPasswordModalOpen(true);
          }
        }}
        dateOffset={persisted.dateOffset}
        onSetDateOffset={(offset) => {
          setPersisted((prev) => ({ ...prev, dateOffset: offset }));
          showToast(offset === 0 ? '已回到今日！' : `已跳轉至 ${offset > 0 ? `未來 +${offset} 天` : `${offset} 天前`}！`);
        }}
        allowFutureDates={allowFutureDates}
        onToggleAllowFutureDates={(allow) => {
          setAllowFutureDates(allow);
          showToast(allow ? '🔓 已解鎖未來日期撕頁！' : '🔒 已恢復常規鎖定規則');
        }}
        streakCount={persisted.streakCount}
        onSetStreakCount={(count) => {
          setPersisted((prev) => ({ ...prev, streakCount: count }));
          showToast(`連續生還天數已設為 ${count} 天`);
        }}
        isTodaySurvived={persisted.survivedDates.includes(currentQuote.date)}
        onToggleTodaySurvived={handleStampSurvived}
        onSelectMeetingPreset={(meetings, presetId) => {
          setActiveMeetings(meetings);
          setActivePresetId(presetId || null);
          setPersisted((prev) => ({ ...prev, calendarConnected: true }));
          showToast('已切換會議行程，已為今日即時開酸！');
        }}
        onOpenPaywall={() => {
          setIsAdminConsoleOpen(false);
          setIsPaywallOpen(true);
        }}
        onOpenIgModal={() => {
          setIsAdminConsoleOpen(false);
          setIsIgModalOpen(true);
        }}
        onOpenBirthdayModal={() => {
          setIsAdminConsoleOpen(false);
          setIsBirthdayModalOpen(true);
        }}
        onResetApp={() => {
          if (window.confirm('確定要清空所有測試紀錄並重設為初始狀態嗎？')) {
            localStorage.clear();
            window.location.reload();
          }
        }}
        onLogoutAdmin={() => {
          logoutAdmin();
          setIsAdminConsoleOpen(false);
          showToast('🔒 已安全登出並鎖定管理員權限');
        }}
      />

      {/* Admin Password Verification Modal */}
      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        onClose={() => setIsAdminPasswordModalOpen(false)}
        onVerify={(pwd) => loginAdmin(pwd)}
        onSuccess={() => {
          showToast('🎉 管理員驗證成功！已解鎖最高權限');
          setIsAdminConsoleOpen(true);
        }}
      />

      {/* Birthday Settings Modal */}
      <BirthdayModal
        isOpen={isBirthdayModalOpen}
        onClose={() => setIsBirthdayModalOpen(false)}
        birthday={persisted.birthday || null}
        onSaveBirthday={(bday) => {
          setPersisted((prev) => ({ ...prev, birthday: bday }));
          if (bday) {
            try {
              const mm = String(bday.month).padStart(2, '0');
              const dd = String(bday.day).padStart(2, '0');
              localStorage.setItem('user_birthday', `${mm}-${dd}`);
            } catch {}
            showToast(`🎂 已成功設定生日為 ${bday.month} 月 ${bday.day} 日！`);
          } else {
            try {
              localStorage.removeItem('user_birthday');
            } catch {}
            showToast('已清除生日紀錄');
          }
        }}
        onPreviewBirthdayQuote={(m, d) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const target = new Date(today.getFullYear(), m - 1, d);
          const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          setPersisted((prev) => ({ ...prev, dateOffset: diff }));
          showToast(`🎂 已跳轉至生日 (${m}/${d}) 預覽專屬特權卡片！`);
        }}
      />
    </div>
  );
};

export default App;
