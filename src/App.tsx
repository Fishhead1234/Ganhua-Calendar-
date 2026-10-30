import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Stamp,
  Share2,
  Sparkles,
  Calendar as CalendarIcon,
} from 'lucide-react';
import quotesData from './data/quotes.json';
import { CalendarQuote, CharacterType } from './types/calendar';
import { TopBar } from './components/TopBar';
import { DeskCalendar } from './components/DeskCalendar';
import { TrioDeskShowcase } from './components/TrioDeskShowcase';
import { IgStoryModal } from './components/IgStoryModal';
import { PaywallModal } from './components/PaywallModal';
import { CalendarSyncBar } from './components/CalendarSyncBar';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { WidgetPreviewDrawer } from './components/WidgetPreviewDrawer';
import { AdminConsoleModal } from './components/AdminConsoleModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { BirthdayModal } from './components/BirthdayModal';
import { FloatingVersionBar } from './components/FloatingVersionBar';
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
} from './services/calendarRoastService';

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
        if (diffDays < 0) {
          // In the past: resume from last opened date (max 365 days back)
          initialOffset = Math.max(-365, diffDays);
        } else {
          initialOffset = 0;
        }
      } else if (typeof parsed.dateOffset === 'number') {
        initialOffset = parsed.dateOffset;
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
  const [viewMode, setViewMode] = useState<'single' | 'trio'>('single');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isIgModalOpen, setIsIgModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isCalendarSyncModalOpen, setIsCalendarSyncModalOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
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
  const roastResult: CalendarRoastResult = useMemo(() => {
    return analyzeCalendarEvents(activeMeetings);
  }, [activeMeetings]);

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

  // Integrated useTodayQuote hook with quotes365.json dataset
  const {
    currentQuote,
    nextQuotePreview,
    isToday,
    isPastDate,
    isBirthday,
    canGoNext,
    canGoPrev,
  } = useTodayQuote({
    dateOffset: persisted.dateOffset,
    isPro,
    isAdmin,
    allowFutureDates,
    calendarConnected: persisted.calendarConnected,
    roastResult: persisted.calendarConnected ? roastResult : null,
    selectedThemeFilter: persisted.selectedTheme,
    birthday: persisted.birthday || null,
  });

  // Check for OTA Remote Content Updates in background on app start
  useEffect(() => {
    contentSyncService.checkForUpdates().then((res) => {
      if (res.updated) {
        showToast(`✨ 日曆內容已自動更新至最新版本 (v${res.version})！`);
      }
    });
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
      syncNativeWidgetData(currentQuote, persisted.streakCount, persisted.offWorkHour);
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
  }, [currentQuote, persisted.streakCount, persisted.offWorkHour]);

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
      showToast('🔒 明天的事明天再煩惱，先活過今天。');
    }
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
          canGoNext={canGoNext}
          canGoPrev={canGoPrev}
          onTearOff={handleNextDay}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          isFavorited={persisted.favoritedIds.includes(currentQuote.id)}
          onToggleFavorite={handleToggleFavorite}
          onBlockedTomorrow={handleBlockedTomorrow}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#2D2D2D] flex flex-col justify-between pb-12">
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
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
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
      <main className="max-w-5xl w-full mx-auto px-4 pt-4 space-y-4">
        {/* A. Calendar Sync Module (Roast Engine) */}
        {viewMode === 'single' && (
          <CalendarSyncBar
            isPro={isPro || isAdmin}
            isConnected={persisted.calendarConnected}
            roastResult={persisted.calendarConnected ? roastResult : null}
            onOpenSyncModal={() => setIsCalendarSyncModalOpen(true)}
            onOpenPaywall={() => setIsPaywallOpen(true)}
          />
        )}

        {/* B. Center Stage: Desk Calendar or 3-Card Showcase */}
        {viewMode === 'trio' ? (
          <TrioDeskShowcase
            quotes={allQuotes}
            artStyle={persisted.artStyle}
            onSelectCard={(quoteId) => {
              const clicked = allQuotes.find((q) => q.id === quoteId);
              if (clicked) {
                if (!isPro && !isAdmin && (clicked.character === 'capybara' || clicked.character === 'ghost')) {
                  setIsPaywallOpen(true);
                  return;
                }
                setPersisted((prev) => ({
                  ...prev,
                  selectedTheme: clicked.character,
                  dateOffset: 0,
                }));
              }
              setViewMode('single');
            }}
          />
        ) : (
          <DeskCalendar
            quote={currentQuote}
            nextQuotePreview={nextQuotePreview}
            artStyle={persisted.artStyle}
            isSurvivedToday={persisted.survivedDates.includes(currentQuote.date)}
            isPastDate={isPastDate}
            canGoNext={canGoNext}
            canGoPrev={canGoPrev}
            onTearOff={handleNextDay}
            onPrevDay={handlePrevDay}
            onNextDay={handleNextDay}
            isFavorited={persisted.favoritedIds.includes(currentQuote.id)}
            onToggleFavorite={handleToggleFavorite}
            onBlockedTomorrow={handleBlockedTomorrow}
          />
        )}

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
            onClick={() => {
              if (persisted.dateOffset < 0) {
                setPersisted((prev) => ({ ...prev, dateOffset: 0 }));
                showToast('已返回今日日曆！');
              } else {
                handleBlockedTomorrow();
              }
            }}
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
        onUpdateMeetings={(meetings) => {
          setActiveMeetings(meetings);
          try {
            localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(meetings));
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
        onSelectMeetingPreset={(meetings) => {
          setActiveMeetings(meetings);
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
