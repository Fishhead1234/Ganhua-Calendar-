import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Stamp,
  Share2,
  Shuffle,
  Sparkles,
  Lock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import quotesData from './data/quotes.json';
import { CalendarQuote, CharacterType, CHARACTER_META } from './types/calendar';
import { TopBar } from './components/TopBar';
import { DeskCalendar } from './components/DeskCalendar';
import { TrioDeskShowcase } from './components/TrioDeskShowcase';
import { IgStoryModal } from './components/IgStoryModal';
import { PaywallModal } from './components/PaywallModal';
import { CalendarSyncBar } from './components/CalendarSyncBar';
import { WidgetPreviewDrawer } from './components/WidgetPreviewDrawer';
import { playPaperTearSound, playStampSound } from './utils/soundEffects';
import { useSubscription } from './hooks/useSubscription';
import {
  CalendarMeeting,
  CalendarRoastResult,
  MOCK_CALENDAR_PRESETS,
  analyzeCalendarEvents,
} from './services/calendarRoastService';

const STORAGE_KEY = 'ganhua_calendar_state_v2';

interface PersistedState {
  selectedTheme: CharacterType | 'all';
  currentDateIndex: number; // 0 = today, -1 = yesterday, -2 = 2 days ago ...
  favoritedIds: string[];
  survivedDates: string[];
  streakCount: number;
  offWorkHour: number;
  artStyle: 'original' | 'svg';
  calendarConnected: boolean;
}

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        selectedTheme: parsed.selectedTheme || 'cat',
        currentDateIndex: typeof parsed.currentDateIndex === 'number' ? parsed.currentDateIndex : 0,
        favoritedIds: Array.isArray(parsed.favoritedIds) ? parsed.favoritedIds : ['q-01'],
        survivedDates: Array.isArray(parsed.survivedDates) ? parsed.survivedDates : [],
        streakCount: typeof parsed.streakCount === 'number' ? parsed.streakCount : 3,
        offWorkHour: typeof parsed.offWorkHour === 'number' ? parsed.offWorkHour : 18,
        artStyle: parsed.artStyle === 'svg' ? 'svg' : 'original',
        calendarConnected: Boolean(parsed.calendarConnected),
      };
    }
  } catch {
    // ignore
  }
  return {
    selectedTheme: 'cat',
    currentDateIndex: 0,
    favoritedIds: ['q-01'],
    survivedDates: [],
    streakCount: 3,
    offWorkHour: 18,
    artStyle: 'original',
    calendarConnected: false,
  };
}

export const App: React.FC = () => {
  const allQuotes = quotesData as CalendarQuote[];
  const { isPro, isLoading: isSubLoading, purchase, restore, toggleMockPro } = useSubscription();

  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());
  const [viewMode, setViewMode] = useState<'single' | 'trio'>('single');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isIgModalOpen, setIsIgModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  // Calendar Roast State
  const [activeMeetings, setActiveMeetings] = useState<CalendarMeeting[]>(() => MOCK_CALENDAR_PRESETS[0].events);
  const roastResult: CalendarRoastResult = useMemo(() => {
    return analyzeCalendarEvents(activeMeetings);
  }, [activeMeetings]);

  const isEmbedMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('embed') === '1';
  }, []);

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

  // Enforce Free Tier Character Gating: if free, force 'cat'
  useEffect(() => {
    if (!isPro && persisted.selectedTheme !== 'cat') {
      setPersisted((prev) => ({ ...prev, selectedTheme: 'cat' }));
    }
  }, [isPro, persisted.selectedTheme]);

  // Today base quote
  const characterQuotes = useMemo(() => {
    return allQuotes.filter((q) => {
      if (persisted.selectedTheme !== 'all' && q.character !== persisted.selectedTheme) {
        return false;
      }
      if (showFavoritesOnly && !persisted.favoritedIds.includes(q.id)) {
        return false;
      }
      return true;
    });
  }, [allQuotes, persisted.selectedTheme, showFavoritesOnly, persisted.favoritedIds]);

  const pool = characterQuotes.length > 0 ? characterQuotes : allQuotes;

  // Map currentDateIndex (0 = today, -1 = yesterday, -2 = 2 days ago...)
  // Max backward history limit: 7 days for Free Tier, unlimited (30+) for Pro Tier
  const maxHistoryDays = isPro ? 30 : 7;
  const clampedOffset = Math.max(-maxHistoryDays, Math.min(0, persisted.currentDateIndex));

  // Determine current active quote
  const currentQuote: CalendarQuote = useMemo(() => {
    // If today (offset === 0) and calendar roast is connected & Pro, dynamically swap today's quote!
    if (clampedOffset === 0 && persisted.calendarConnected && isPro) {
      const base = pool[0] || allQuotes[0];
      return {
        ...base,
        quote: roastResult.roastQuote,
        subtext: roastResult.roastSubtext,
        yi: roastResult.yi,
        ji: roastResult.ji,
      };
    }

    // Historical date indexing
    const baseIndex = Math.abs(clampedOffset) % pool.length;
    const item = pool[baseIndex] || allQuotes[0];

    // Compute synthetic date string matching offset
    const dt = new Date();
    dt.setDate(dt.getDate() + clampedOffset);
    const dateStr = dt.toISOString().split('T')[0];

    return {
      ...item,
      date: dateStr,
    };
  }, [pool, allQuotes, clampedOffset, persisted.calendarConnected, isPro, roastResult]);

  const nextQuotePreview = pool[(Math.abs(clampedOffset + 1)) % pool.length] || allQuotes[0];

  const isToday = clampedOffset === 0;
  const isPastDate = clampedOffset < 0;
  const canGoNext = clampedOffset < 0; // Strictly backward navigation: cannot peek forward past today!
  const canGoPrev = Math.abs(clampedOffset) < maxHistoryDays;

  // Handlers for Backward Navigation
  const handlePrevDay = () => {
    if (!canGoPrev) {
      if (!isPro) {
        setIsPaywallOpen(true);
      } else {
        showToast('已翻閱至最久遠的生存存檔紀錄。');
      }
      return;
    }
    playPaperTearSound();
    setPersisted((prev) => ({
      ...prev,
      currentDateIndex: prev.currentDateIndex - 1,
    }));
  };

  const handleNextDay = () => {
    if (canGoNext) {
      playPaperTearSound();
      setPersisted((prev) => ({
        ...prev,
        currentDateIndex: prev.currentDateIndex + 1,
      }));
    } else {
      handleBlockedTomorrow();
    }
  };

  const handleBlockedTomorrow = () => {
    showToast('🔒 明天的事明天再煩惱，先活過今天。');
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
          if (!isPro && (theme === 'capybara' || theme === 'ghost' || theme === 'all')) {
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
        onOpenPaywall={() => setIsPaywallOpen(true)}
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
            isPro={isPro}
            isConnected={persisted.calendarConnected}
            roastResult={persisted.calendarConnected ? roastResult : null}
            onConnectCalendar={() => {
              setPersisted((prev) => ({ ...prev, calendarConnected: true }));
              showToast('📅 已連接行事曆！已為您即時掃描並開啟毒舌模式');
            }}
            onSelectPreset={(events) => {
              setActiveMeetings(events);
              showToast('已切換會議行程，已為今日即時開酸！');
            }}
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
                if (!isPro && (clicked.character === 'capybara' || clicked.character === 'ghost')) {
                  setIsPaywallOpen(true);
                  return;
                }
                setPersisted((prev) => ({
                  ...prev,
                  selectedTheme: clicked.character,
                  currentDateIndex: 0,
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
              if (clampedOffset < 0) {
                // If in past archive, return to today
                setPersisted((prev) => ({ ...prev, currentDateIndex: 0 }));
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
    </div>
  );
};

export default App;
