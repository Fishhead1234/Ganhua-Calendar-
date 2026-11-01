import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Stamp,
  Share2,
  Sparkles,
  Calendar as CalendarIcon,
  RotateCcw,
} from 'lucide-react';
import quotesData from './data/quotes.json';
import { CalendarQuote, CharacterType } from './types/calendar';
import { TopBar } from './components/TopBar';
import { DeskCalendar } from './components/DeskCalendar';
import { IgStoryModal } from './components/IgStoryModal';
import { PaywallModal } from './components/PaywallModal';
import { CalendarSyncBar } from './components/CalendarSyncBar';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { WidgetPreviewDrawer } from './components/WidgetPreviewDrawer';
import { AdminConsoleModal } from './components/AdminConsoleModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { BirthdayModal } from './components/BirthdayModal';
import { FloatingVersionBar } from './components/FloatingVersionBar';
import { DailyAgendaStrip } from './components/DailyAgendaStrip';
import { MonthlyCalendarModal } from './components/MonthlyCalendarModal';
import { AddEventModal } from './components/AddEventModal';
import { syncNativeWidgetData } from './services/widgetBridgeService';
import { playPaperTearSound, playStampSound } from './utils/soundEffects';
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
  CustomCalendarEvent,
  getCustomEvents,
  saveCustomEvent,
  deleteCustomEvent,
  getMergedEvents,
  writeNativeDeviceCalendarEvent,
  deleteNativeDeviceCalendarEvent,
  pushEventToGoogleAppsScript,
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
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadPersistedState(): PersistedState {
  const todayYmd = getTodayYmd();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let initialOffset = 0;

      // Experience the joy of tearing calendar:
      // If user opened on a previous date, resume from that date so user can tear off missed days!
      if (typeof parsed.lastOpenedDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastOpenedDateStr)) {
        const [ly, lm, ld] = parsed.lastOpenedDateStr.split('-').map(Number);
        const t = new Date();
        const todayDate = new Date(t.getFullYear(), t.getMonth(), t.getDate());
        const lastOpenedDate = new Date(ly, lm - 1, ld);
        const diffMs = lastOpenedDate.getTime() - todayDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        // Allow resuming on viewed date (both past archive and future schedule up to 365 days)
        initialOffset = Math.max(-365, Math.min(365, diffDays));
      } else if (typeof parsed.dateOffset === 'number') {
        initialOffset = Math.max(-365, Math.min(365, parsed.dateOffset));
      }

      return {
        selectedTheme: parsed.selectedTheme || 'all',
        dateOffset: initialOffset,
        favoritedIds: Array.isArray(parsed.favoritedIds) ? parsed.favoritedIds : ['q365-01-01'],
        survivedDates: Array.isArray(parsed.survivedDates) ? parsed.survivedDates : [],
        streakCount: typeof parsed.streakCount === 'number' ? parsed.streakCount : 3,
        offWorkHour: typeof parsed.offWorkHour === 'number' ? parsed.offWorkHour : 18,
        artStyle: parsed.artStyle === 'svg' ? 'svg' : 'original',
        calendarConnected: Boolean(parsed.calendarConnected),
        birthday:
          parsed.birthday &&
          typeof parsed.birthday.month === 'number' &&
          typeof parsed.birthday.day === 'number'
            ? parsed.birthday
            : null,
        lastOpenedDateStr: parsed.lastOpenedDateStr || todayYmd,
      };
    }
  } catch {
    // ignore
  }
  return {
    selectedTheme: 'all',
    dateOffset: 0,
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
    isLoading: isSubLoading,
    loginAdmin,
    logoutAdmin,
    setTier,
    purchase,
    restore,
    toggleMockPro,
  } = useSubscription();

  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isIgModalOpen, setIsIgModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isCalendarSyncModalOpen, setIsCalendarSyncModalOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const [isMonthlyCalendarOpen, setIsMonthlyCalendarOpen] = useState(false);
  const [specialQuoteCycleIndex, setSpecialQuoteCycleIndex] = useState(0);
  const [allowFutureDates, setAllowFutureDates] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

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
    const y = currentDateObj.getFullYear();
    const m = String(currentDateObj.getMonth() + 1).padStart(2, '0');
    const d = String(currentDateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDateObj]);

  // Custom Appointments State
  const [customEvents, setCustomEvents] = useState<CustomCalendarEvent[]>(() => getCustomEvents());
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [addEventInitialDate, setAddEventInitialDate] = useState<string>('');
  const [editingCustomEvent, setEditingCustomEvent] = useState<CustomCalendarEvent | null>(null);

  // Merged meetings for currently viewed date
  const effectiveMeetings = useMemo(() => {
    return getMergedEvents(activeMeetings, currentDateKey);
  }, [activeMeetings, customEvents, currentDateKey]);

  // All merged meetings across all dates for month widget
  const allAppointments = useMemo(() => {
    const customAsMeetings: CalendarMeeting[] = (customEvents || []).map((e) => ({
      id: e.id,
      title: e.title,
      startHour: e.startHour,
      startMinute: e.startMinute,
      durationMinutes: e.durationMinutes,
      isAllDay: e.isAllDay,
      dateKey: e.dateKey,
      notes: e.notes,
      source: 'local',
    }));
    return [...activeMeetings, ...customAsMeetings];
  }, [activeMeetings, customEvents]);

  const roastResult: CalendarRoastResult = useMemo(() => {
    return analyzeCalendarEvents(effectiveMeetings, activePresetId || undefined);
  }, [effectiveMeetings, activePresetId]);

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
  });

  // Check for OTA Remote Content Updates in background on app start
  useEffect(() => {
    contentSyncService.checkForUpdates().then((res) => {
      if (res.updated) {
        showToast(`✨ 日曆內容已自動更新至最新版本 (v${res.version})！`);
      }
    });

    // Auto-sync calendar events on app start if calendar connected
    if (persisted.calendarConnected) {
      const isNative =
        typeof window !== 'undefined' &&
        (window as any).Capacitor &&
        (window as any).Capacitor.isNativePlatform();

      if (isNative) {
        fetchNativeDeviceCalendarEvents()
          .then((events) => {
            if (events && events.length > 0) {
              setActiveMeetings(events);
              setActivePresetId(null);
            }
          })
          .catch(() => {});
      } else {
        const savedLiveUrl = localStorage.getItem('live_calendar_url');
        if (savedLiveUrl) {
          fetchLiveJsonCalendarEvents(savedLiveUrl)
            .then((events) => {
              if (events && events.length > 0) {
                setActiveMeetings(events);
                setActivePresetId(null);
              }
            })
            .catch(() => {});
        }
      }
    }
  }, []);

  // Confetti celebration if today is user's birthday
  useEffect(() => {
    if (isBirthday && isToday) {
      try {
        confetti({
          particleCount: 80,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#C83E31', '#D4B483', '#FAF7F0', '#E58C8A'],
        });
      } catch {
        // ignore
      }
    }
  }, [isBirthday, isToday]);

  // Sync to native Android widget whenever quote or streak updates
  useEffect(() => {
    if (currentQuote) {
      syncNativeWidgetData(
        currentQuote,
        persisted.streakCount,
        persisted.offWorkHour,
        persisted.survivedDates,
        effectiveMeetings,
        allAppointments
      );
      // Advance lastOpenedDateStr whenever user tears forward / views a newer date
      setPersisted((prev) => {
        if (!prev.lastOpenedDateStr || currentQuote.date > prev.lastOpenedDateStr) {
          return {
            ...prev,
            lastOpenedDateStr: currentQuote.date,
          };
        }
        return prev;
      });
    }
  }, [currentQuote, persisted.streakCount, persisted.offWorkHour, persisted.survivedDates, effectiveMeetings, allAppointments]);

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
      playPaperTearSound();
      setPersisted((prev) => ({
        ...prev,
        dateOffset: prev.dateOffset + 1,
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
      setEditingCustomEvent(null);
      setAddEventInitialDate(currentDateKey);
      setIsAddEventModalOpen(true);
    }
  };

  const handleSaveCustomEvent = (newEvent: CustomCalendarEvent) => {
    saveCustomEvent(newEvent);
    setCustomEvents(getCustomEvents());

    // 2. Native device calendar write (Capacitor)
    const [y, m, d] = newEvent.dateKey.split('-').map(Number);
    const sDate = new Date(y, (m || 1) - 1, d || 1, newEvent.startHour, newEvent.startMinute);
    const eDate = new Date(sDate.getTime() + newEvent.durationMinutes * 60 * 1000);
    writeNativeDeviceCalendarEvent({
      title: newEvent.title,
      startDate: sDate,
      endDate: eDate,
      isAllDay: newEvent.isAllDay,
      notes: newEvent.notes,
    }).catch(() => {});

    // 3. Google Apps Script Push (Two-way web bridge)
    pushEventToGoogleAppsScript(newEvent).catch(() => {});

    showToast(`✨ 行程「${newEvent.title}」已儲存！已即時連動專屬幹話`);
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    deleteCustomEvent(eventId);
    setCustomEvents(getCustomEvents());
    deleteNativeDeviceCalendarEvent(eventId).catch(() => {});
    showToast('🗑️ 行程已成功刪除');
  };

  const handleJumpToDate = (targetDate: Date) => {
    const t = new Date();
    const todayMidnight = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffDays = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / 86400000);
    setPersisted((prev) => ({
      ...prev,
      dateOffset: diffDays,
    }));
    if (diffDays > 0) {
      showToast('🔮 已檢視未來預排行程，幹話將於當日 00:00 解鎖！');
    } else if (diffDays === 0) {
      showToast('已返回今日日曆！');
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

    // Read pending 1x1 widget survival stamps
    if (win.Capacitor?.Plugins?.GanhuaWidgetBridge?.getPendingSurvivedSync) {
      win.Capacitor.Plugins.GanhuaWidgetBridge.getPendingSurvivedSync().then((res: any) => {
        if (res?.survivedDatesJson) {
          try {
            const list = JSON.parse(res.survivedDatesJson);
            if (Array.isArray(list) && list.length > 0) {
              setPersisted((prev) => ({
                ...prev,
                survivedDates: Array.from(new Set([...prev.survivedDates, ...list])),
                streakCount:
                  res.streakCount && res.streakCount > prev.streakCount
                    ? res.streakCount
                    : prev.streakCount,
              }));
            }
          } catch {}
        }
      }).catch(() => {});
    }

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
    };
  }, []);

  const handleBackToToday = () => {
    setPersisted((prev) => ({ ...prev, dateOffset: 0 }));
    showToast('已返回今日日曆！');
  };

  // Stamp Survived
  const handleStampSurvived = () => {
    playStampSound();
    const alreadyStamped = persisted.survivedDates.includes(currentQuote.date);

    if (!alreadyStamped) {
      try {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.7 },
          colors: ['#C83E31', '#D4B483', '#2D2D2D'],
        });
      } catch {
        // ignore
      }
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
        {/* A. Calendar Sync Module (Roast Engine) */}
        <CalendarSyncBar
          isPro={isPro || isAdmin}
          isConnected={persisted.calendarConnected}
          roastResult={persisted.calendarConnected ? roastResult : null}
          onOpenSyncModal={() => setIsCalendarSyncModalOpen(true)}
          onOpenPaywall={() => setIsPaywallOpen(true)}
          onToggleConnected={(connected) => {
            setPersisted((prev) => ({ ...prev, calendarConnected: connected }));
          }}
          onOpenAddEvent={() => handleOpenAddEvent(currentQuote?.date)}
        />

        {/* B. Center Stage: Desk Calendar Card */}
        {/* Quick Return to Today Floating Banner when viewing future or past date */}
            {persisted.dateOffset !== 0 && (
              <div className="max-w-[390px] mx-auto flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#2D2D2D] text-[#F9F6F0] border border-[#D4B483] shadow-lg animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{isFutureDate ? '🔮' : '📜'}</span>
                  <span className="text-xs font-sans font-bold">
                    {isFutureDate ? '未來預約日程' : '歷史存檔'}：{currentDateObj.getMonth() + 1}月{currentDateObj.getDate()}日
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBackToToday}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#D4B483] hover:bg-[#c2a270] text-[#2D2D2D] text-xs font-sans font-black transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>返回今日</span>
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
            />

            {/* Daily Agenda & Sarcastic Timeline Strip */}
            <DailyAgendaStrip
              events={effectiveMeetings}
              isFuture={isFutureDate}
              onOpenSyncModal={() => setIsCalendarSyncModalOpen(true)}
              onOpenAddEvent={() => handleOpenAddEvent(currentQuote?.date)}
              onEditEvent={handleEditMeeting}
            />

        {/* C. Bottom Action Bar */}
        <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleStampSurvived}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 font-sans font-extrabold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-[0_4px_0_#2D2D2D] ${
              persisted.survivedDates.includes(currentQuote.date)
                ? 'bg-[#C83E31] text-white border-[#2D2D2D]'
                : 'bg-[#FAF7F0] hover:bg-[#C83E31]/10 text-[#C83E31] border-[#2D2D2D]'
            }`}
          >
            <Stamp className="w-4 h-4 shrink-0" />
            <span>
              {persisted.survivedDates.includes(currentQuote.date)
                ? '✓ 今日已平安生還'
                : '今日已平安下班 (蓋章)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsIgModalOpen(true)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 border-[#2D2D2D] bg-[#2D2D2D] hover:bg-[#1c1c1c] text-[#F9F6F0] font-sans font-extrabold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-[0_4px_0_#6E6A63]"
          >
            <Share2 className="w-4 h-4 shrink-0 text-[#D4B483]" />
            <span>分享到 IG 限動 (9:16)</span>
          </button>

          <button
            type="button"
            onClick={handleBackToToday}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 border-[#2D2D2D] bg-[#FAF7F0] hover:bg-[#EAE3D5] text-[#2D2D2D] font-sans font-extrabold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-[0_4px_0_#2D2D2D]"
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span>{isToday ? '今日生還中' : '返回今日日曆'}</span>
          </button>
        </div>

        {/* D. Collapsible Widget Preview Drawer */}
        <WidgetPreviewDrawer
          quote={currentQuote}
          artStyle={persisted.artStyle}
          streakCount={persisted.streakCount}
          offWorkHour={persisted.offWorkHour}
          survivedDates={persisted.survivedDates}
          activeMeetings={effectiveMeetings}
        />
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
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onPurchase={purchase}
        onRestore={restore}
        isLoading={isSubLoading}
        isPro={isPro}
        onToggleMockPro={toggleMockPro}
      />

      {/* Calendar Sync & Roast Settings Modal */}
      <CalendarSyncModal
        isOpen={isCalendarSyncModalOpen}
        onClose={() => setIsCalendarSyncModalOpen(false)}
        isConnected={persisted.calendarConnected}
        activeMeetings={activeMeetings}
        activePresetId={activePresetId}
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
      />

      {/* Monthly Desk Calendar Modal */}
      <MonthlyCalendarModal
        isOpen={isMonthlyCalendarOpen}
        onClose={() => setIsMonthlyCalendarOpen(false)}
        currentDate={currentDateObj}
        today={new Date()}
        survivedDates={persisted.survivedDates || []}
        activeMeetings={effectiveMeetings || []}
        customEvents={customEvents}
        quotes={contentSyncService.getQuotes365()}
        onSelectDate={handleJumpToDate}
        onOpenAddEvent={(dateStr) => handleOpenAddEvent(dateStr)}
        onEditEvent={handleEditMeeting}
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

      {/* Floating Version Quick-Switcher */}
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
      />

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
            showToast(`🎂 已成功設定生日為 ${bday.month} 月 ${bday.day} 日！`);
          } else {
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
