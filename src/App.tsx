import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Stamp,
  Share2,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import quotesData from './data/quotes.json';
import { CalendarQuote, CharacterType, CHARACTER_META } from './types/calendar';
import { TopBar } from './components/TopBar';
import { DeskCalendarCard } from './components/DeskCalendarCard';
import { TrioDeskShowcase } from './components/TrioDeskShowcase';
import { IgStoryModal } from './components/IgStoryModal';
import { WidgetPreviewDrawer } from './components/WidgetPreviewDrawer';
import { playPaperTearSound, playStampSound } from './utils/soundEffects';

const STORAGE_KEY = 'ganhua_calendar_state_v1';

interface PersistedState {
  selectedTheme: CharacterType | 'all';
  currentQuoteId: string;
  favoritedIds: string[];
  survivedDates: string[];
  streakCount: number;
  offWorkHour: number;
  artStyle: 'original' | 'svg';
}

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        selectedTheme: parsed.selectedTheme || 'all',
        currentQuoteId: parsed.currentQuoteId || 'q-01',
        favoritedIds: Array.isArray(parsed.favoritedIds) ? parsed.favoritedIds : ['q-01'],
        survivedDates: Array.isArray(parsed.survivedDates) ? parsed.survivedDates : [],
        streakCount: typeof parsed.streakCount === 'number' ? parsed.streakCount : 3,
        offWorkHour: typeof parsed.offWorkHour === 'number' ? parsed.offWorkHour : 18,
        artStyle: parsed.artStyle === 'svg' ? 'svg' : 'original',
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    selectedTheme: 'all',
    currentQuoteId: 'q-01',
    favoritedIds: ['q-01'],
    survivedDates: [],
    streakCount: 3,
    offWorkHour: 18,
    artStyle: 'original',
  };
}

export const App: React.FC = () => {
  const allQuotes = quotesData as CalendarQuote[];
  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());
  const [viewMode, setViewMode] = useState<'single' | 'trio'>('single');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isIgModalOpen, setIsIgModalOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  // Check if loaded inside a Notion / Desktop Embed (?embed=1)
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
    setTimeout(() => setToastText(null), 2600);
  };

  // Filtered quote pool based on selected character theme and favorites filter
  const filteredQuotes = useMemo(() => {
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

  const activePool = filteredQuotes.length > 0 ? filteredQuotes : allQuotes;

  const currentIndex = useMemo(() => {
    const idx = activePool.findIndex((q) => q.id === persisted.currentQuoteId);
    return idx >= 0 ? idx : 0;
  }, [activePool, persisted.currentQuoteId]);

  const currentQuote = activePool[currentIndex] || allQuotes[0];
  const nextQuotePreview = activePool[(currentIndex + 1) % activePool.length] || allQuotes[0];

  const isSurvivedForCurrentQuote = persisted.survivedDates.includes(currentQuote.date);
  const isFavorited = persisted.favoritedIds.includes(currentQuote.id);

  // Tear off current page to reveal next quote
  const handleTearToNext = () => {
    playPaperTearSound();
    const nextIdx = (currentIndex + 1) % activePool.length;
    const nextQ = activePool[nextIdx];
    setTimeout(() => {
      setPersisted((prev) => ({
        ...prev,
        currentQuoteId: nextQ.id,
      }));
    }, 220);
  };

  // Random draw quote
  const handleRandomDraw = () => {
    playPaperTearSound();
    if (activePool.length <= 1) return;
    let randIdx = Math.floor(Math.random() * activePool.length);
    if (randIdx === currentIndex) {
      randIdx = (currentIndex + 1) % activePool.length;
    }
    const nextQ = activePool[randIdx];
    setPersisted((prev) => ({
      ...prev,
      currentQuoteId: nextQ.id,
    }));
    showToast(`🎲 已抽出一張「${CHARACTER_META[nextQ.character].nameZh}」幹話曆！`);
  };

  // Daily Survived Stamp Action ("今日已平安下班")
  const handleStampSurvived = () => {
    playStampSound();
    const alreadyStamped = persisted.survivedDates.includes(currentQuote.date);

    if (!alreadyStamped) {
      try {
        confetti({
          particleCount: 45,
          spread: 60,
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
      showToast('💮 蓋章成功！今日已平安下班，生存天數 +1');
    } else {
      // Allow toggling off if clicked again, or re-stamping
      setPersisted((prev) => ({
        ...prev,
        survivedDates: prev.survivedDates.filter((d) => d !== currentQuote.date),
        streakCount: Math.max(0, prev.streakCount - 1),
      }));
      showToast('已收回今日下班印章');
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

  const handleSelectTheme = (theme: CharacterType | 'all') => {
    const firstMatch =
      theme === 'all'
        ? allQuotes[0]
        : allQuotes.find((q) => q.character === theme) || allQuotes[0];
    setPersisted((prev) => ({
      ...prev,
      selectedTheme: theme,
      currentQuoteId: firstMatch.id,
    }));
  };

  // Clean standalone Notion Embed mode if ?embed=1
  if (isEmbedMode) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4">
        <DeskCalendarCard
          quote={currentQuote}
          nextQuotePreview={nextQuotePreview}
          artStyle={persisted.artStyle}
          isSurvivedToday={isSurvivedForCurrentQuote}
          isFavorited={isFavorited}
          onToggleFavorite={handleToggleFavorite}
          onTearOff={handleTearToNext}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#2D2D2D] flex flex-col justify-between pb-12">
      {/* 1. Top Bar: Live Clock, Office Countdown, Theme Switcher */}
      <TopBar
        selectedTheme={persisted.selectedTheme}
        onSelectTheme={handleSelectTheme}
        streakCount={persisted.streakCount}
        offWorkHour={persisted.offWorkHour}
        onChangeOffWorkHour={(hr) =>
          setPersisted((prev) => ({ ...prev, offWorkHour: hr }))
        }
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
      />

      {/* Toast Notification */}
      {toastText && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto z-40 max-w-sm mx-auto rounded-2xl bg-[#2D2D2D] text-[#F9F6F0] px-4 py-3 text-xs font-sans font-bold shadow-xl flex items-center gap-2 border border-[#D4B483]/40">
          <Sparkles className="w-4 h-4 text-[#D4B483] shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      {/* 2. Center Stage: Single Tear-Off Desk Calendar OR 3-Card Wooden Desk Showcase */}
      <main className="max-w-5xl w-full mx-auto px-4 pt-5 space-y-6">
        {viewMode === 'trio' ? (
          <TrioDeskShowcase
            quotes={allQuotes}
            artStyle={persisted.artStyle}
            onSelectCard={(quoteId) => {
              setPersisted((prev) => ({ ...prev, currentQuoteId: quoteId }));
              setViewMode('single');
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Quick Prev / Next Day Indicator above Card */}
            <div className="max-w-[390px] mx-auto flex items-center justify-between text-xs font-sans text-[#6E6A63] px-1">
              <button
                type="button"
                onClick={() => {
                  playPaperTearSound();
                  const prevIdx = (currentIndex - 1 + activePool.length) % activePool.length;
                  setPersisted((prev) => ({
                    ...prev,
                    currentQuoteId: activePool[prevIdx].id,
                  }));
                }}
                className="inline-flex items-center gap-1 hover:text-[#2D2D2D] font-bold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一頁</span>
              </button>

              <span className="font-mono font-bold text-[11px]">
                第 {currentIndex + 1} / {activePool.length} 頁 •{' '}
                {CHARACTER_META[currentQuote.character].tagline}
              </span>

              <button
                type="button"
                onClick={handleTearToNext}
                className="inline-flex items-center gap-1 hover:text-[#2D2D2D] font-bold cursor-pointer"
              >
                <span>撕下一頁</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Desk Calendar Card */}
            <DeskCalendarCard
              quote={currentQuote}
              nextQuotePreview={nextQuotePreview}
              artStyle={persisted.artStyle}
              isSurvivedToday={isSurvivedForCurrentQuote}
              isFavorited={isFavorited}
              onToggleFavorite={handleToggleFavorite}
              onTearOff={handleTearToNext}
            />
          </div>
        )}

        {/* 3. Bottom Action Bar: Daily Survived Stamp, Share to IG Story, Random Draw */}
        <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleStampSurvived}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 font-sans font-extrabold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-[0_4px_0_#2D2D2D] ${
              isSurvivedForCurrentQuote
                ? 'bg-[#C83E31] text-white border-[#2D2D2D]'
                : 'bg-[#FAF7F0] hover:bg-[#C83E31]/10 text-[#C83E31] border-[#2D2D2D]'
            }`}
          >
            <Stamp className="w-4 h-4 shrink-0" />
            <span>
              {isSurvivedForCurrentQuote ? '✓ 今日已平安下班' : '今日已平安下班 (蓋章)'}
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
            onClick={handleRandomDraw}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 border-[#2D2D2D] bg-[#FAF7F0] hover:bg-[#EAE3D5] text-[#2D2D2D] font-sans font-extrabold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-[0_4px_0_#2D2D2D]"
          >
            <Shuffle className="w-4 h-4 shrink-0" />
            <span>隨機抽一張</span>
          </button>
        </div>

        {/* 4. Collapsible Widget Preview Drawer (iOS Lock Screen, 2x4 Home Widget, Notion Embed) */}
        <WidgetPreviewDrawer
          quote={currentQuote}
          artStyle={persisted.artStyle}
          streakCount={persisted.streakCount}
          offWorkHour={persisted.offWorkHour}
        />
      </main>

      {/* IG Story 9:16 Export Modal */}
      <IgStoryModal
        isOpen={isIgModalOpen}
        onClose={() => setIsIgModalOpen(false)}
        quote={currentQuote}
        isSurvivedToday={isSurvivedForCurrentQuote}
        streakCount={persisted.streakCount}
        artStyle={persisted.artStyle}
      />
    </div>
  );
};

export default App;

