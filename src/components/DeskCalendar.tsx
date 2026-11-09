import React, { useState, useRef } from 'react';
import {
  Heart,
  Copy,
  Check,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Lock,
  Clock,
  Calendar,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { CharacterIllustration } from './CharacterIllustration';
import { parseQuoteDateDisplay } from './DeskCalendarCard';
import { getLunarDetails } from '../utils/lunarUtils';
import { playPaperTearSound, playLockedBounceSound } from '../utils/soundEffects';
import { APP_VERSION } from '../constants/version';

interface DeskCalendarProps {
  quote: CalendarQuote;
  nextQuotePreview?: CalendarQuote;
  artStyle: 'original' | 'svg';
  isSurvivedToday: boolean;
  isPastDate: boolean;
  isFutureDate?: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  onTearOff: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onBlockedTomorrow: () => void;
  onOpenMonthlyCalendar?: () => void;
  onCycleSpecialQuote?: () => void;
  onBackToToday?: () => void;
  onShowToast?: (msg: string) => void;
  onToggleRoastMode?: () => void;
  isTodayUnlocked?: boolean;
}

export const DeskCalendar: React.FC<DeskCalendarProps> = ({
  quote,
  nextQuotePreview,
  artStyle,
  isSurvivedToday,
  isPastDate,
  isFutureDate = false,
  canGoNext,
  canGoPrev,
  onTearOff,
  onPrevDay,
  onNextDay,
  isFavorited,
  onToggleFavorite,
  onBlockedTomorrow,
  onOpenMonthlyCalendar,
  onCycleSpecialQuote,
  onBackToToday,
  onShowToast,
  onToggleRoastMode,
  isTodayUnlocked = true,
}) => {
  const [isTearing, setIsTearing] = useState(false);
  const [tearDirection, setTearDirection] = useState<'tear_away' | 'flip_right'>('tear_away');
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [copied, setCopied] = useState(false);

  const isDraggingBody = useRef(false);
  const isDraggingStrip = useRef(false);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartTime = useRef<number>(0);

  const isToday = !isPastDate && !isFutureDate;

  const dateInfo = parseQuoteDateDisplay(quote.date);
  const nextDateInfo = nextQuotePreview ? parseQuoteDateDisplay(nextQuotePreview.date) : dateInfo;
  const charMeta = CHARACTER_META[quote.character] || CHARACTER_META.cat;

  // Real Taiwanese Lunar Calendar & 24 節氣
  const [qYear, qMonth, qDay] = quote.date.split('-').map(Number);
  const cardDate = new Date(qYear, (qMonth || 1) - 1, qDay || 1);
  const lunarInfo = getLunarDetails(cardDate);

  const [nqYear, nqMonth, nqDay] = nextQuotePreview ? nextQuotePreview.date.split('-').map(Number) : [qYear, qMonth, qDay];
  const nextCardDate = new Date(nqYear, (nqMonth || 1) - 1, nqDay || 1);
  const nextLunarInfo = getLunarDetails(nextCardDate);

  const triggerTearForward = () => {
    if (isTearing) return;
    if (isPastDate && canGoNext) {
      playPaperTearSound();
      setTearDirection('tear_away');
      setIsTearing(true);
      setDragOffsetX(0);
      setDragOffsetY(0);
      setTimeout(() => {
        onNextDay();
        setIsTearing(false);
      }, 320);
    } else {
      playLockedBounceSound();
      setDragOffsetX(0);
      setDragOffsetY(0);
      onBlockedTomorrow();
    }
  };

  // Card Body: Horizontal swipe only with touch-action: pan-y (vertical scrolling preserved!)
  const handleBodyPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragStartTime.current = Date.now();
    isDraggingBody.current = false;
  };

  const handleBodyPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null || dragStartY.current === null || isTearing) return;
    const deltaX = e.clientX - dragStartX.current;
    const deltaY = e.clientY - dragStartY.current;

    if (!isDraggingBody.current) {
      // If moving predominantly vertically, abort drag so browser handles smooth page scrolling!
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        dragStartX.current = null;
        dragStartY.current = null;
        return;
      }
      // If moving horizontally, lock into card drag!
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
        isDraggingBody.current = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      } else {
        return;
      }
    }

    if (isToday || isFutureDate) {
      const clampedX = deltaX > 0
        ? Math.min(140, deltaX * 0.6)
        : Math.max(-25, deltaX * 0.12);
      setDragOffsetX(clampedX);
    } else {
      setDragOffsetX(Math.max(-220, Math.min(220, deltaX)));
    }
  };

  const handleBodyPointerUp = (e: React.PointerEvent) => {
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (!isDraggingBody.current || dragStartX.current === null) {
      dragStartX.current = null;
      dragStartY.current = null;
      isDraggingBody.current = false;
      setDragOffsetX(0);
      return;
    }

    const deltaX = e.clientX - dragStartX.current;
    const elapsedSeconds = Math.max(0.04, (Date.now() - dragStartTime.current) / 1000);
    const velocityX = deltaX / elapsedSeconds;

    dragStartX.current = null;
    dragStartY.current = null;
    isDraggingBody.current = false;

    // Right swipe: Previous day flip
    if (deltaX > 75 || velocityX > 450) {
      if (canGoPrev) {
        setTearDirection('flip_right');
        setIsTearing(true);
        setTimeout(() => {
          onPrevDay();
          setIsTearing(false);
          setDragOffsetX(0);
        }, 280);
        return;
      }
    }

    // Left swipe: Next day
    if (deltaX < -75 || velocityX < -450) {
      if (isPastDate && canGoNext) {
        playPaperTearSound();
        setTearDirection('tear_away');
        setIsTearing(true);
        setTimeout(() => {
          onNextDay();
          setIsTearing(false);
          setDragOffsetX(0);
        }, 320);
        return;
      } else {
        playLockedBounceSound();
        setDragOffsetX(0);
        onBlockedTomorrow();
        return;
      }
    }

    setDragOffsetX(0);
  };

  // Header Strip: Dedicated downward pull-to-tear gesture
  const handleStripPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragStartTime.current = Date.now();
    isDraggingStrip.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleStripPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingStrip.current || dragStartY.current === null || isTearing) return;
    const rawDeltaY = e.clientY - dragStartY.current;

    if (isToday || isFutureDate) {
      const clampedY = rawDeltaY > 0
        ? Math.min(30, rawDeltaY * 0.15)
        : Math.max(-10, rawDeltaY * 0.08);
      setDragOffsetY(clampedY);
    } else {
      setDragOffsetY(Math.max(-10, Math.min(220, rawDeltaY)));
    }
  };

  const handleStripPointerUp = (e: React.PointerEvent) => {
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (!isDraggingStrip.current || dragStartY.current === null) {
      dragStartX.current = null;
      dragStartY.current = null;
      isDraggingStrip.current = false;
      setDragOffsetY(0);
      return;
    }

    const rawDeltaY = e.clientY - dragStartY.current;
    const elapsedSeconds = Math.max(0.04, (Date.now() - dragStartTime.current) / 1000);
    const velocityY = rawDeltaY / elapsedSeconds;

    dragStartX.current = null;
    dragStartY.current = null;
    isDraggingStrip.current = false;

    if (rawDeltaY > 70 || velocityY > 400) {
      if (isPastDate && canGoNext) {
        playPaperTearSound();
        setTearDirection('tear_away');
        setIsTearing(true);
        setTimeout(() => {
          onNextDay();
          setIsTearing(false);
          setDragOffsetY(0);
        }, 320);
        return;
      } else {
        playLockedBounceSound();
        setDragOffsetY(0);
        onBlockedTomorrow();
        return;
      }
    }

    setDragOffsetY(0);
  };

  const handleCopyQuote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`「${quote.quote}」— 幹話日曆 (${charMeta.nameZh})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative w-full max-w-[400px] mx-auto select-none pt-2 pb-4 px-3 sm:px-5">
      {/* Navigation Flip Bar */}
      <div className="flex items-center justify-between text-xs font-sans text-[#6E6A63] px-1 mb-2">
        <button
          type="button"
          onClick={onPrevDay}
          disabled={!canGoPrev}
          className={`inline-flex items-center gap-1 font-bold cursor-pointer transition ${
            canGoPrev ? 'hover:text-[#2D2D2D]' : 'opacity-40 cursor-not-allowed'
          }`}
          title="回顧過往生存日曆存檔"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>前一日 (生存存檔)</span>
        </button>

        {isPastDate || isFutureDate ? (
          <button
            type="button"
            onClick={onBackToToday}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2D2D2D] text-[#F9F6F0] hover:bg-[#1a1a1a] text-[11px] font-sans font-bold transition active:scale-95 cursor-pointer shadow-xs border border-[#D4B483]/50"
            title="點擊立即回到今日"
          >
            <RotateCcw className="w-3 h-3 text-[#D4B483]" />
            <span>{isFutureDate ? '未來日程 (回到今天)' : '歷史存檔 (回到今天)'}</span>
          </button>
        ) : (
          <span className="font-mono font-bold text-[11px] text-[#2D2D2D]">
            📌 今日限定幹話
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (canGoNext) {
              onNextDay();
            } else {
              playLockedBounceSound();
              onBlockedTomorrow();
            }
          }}
          className={`inline-flex items-center gap-1 font-bold cursor-pointer transition ${
            canGoNext ? 'hover:text-[#2D2D2D]' : 'text-[#6E6A63]/60'
          }`}
          title={canGoNext ? '返回較近日期' : '明天的事明天再煩惱，先活過今天。'}
        >
          <span>{canGoNext ? '後一日' : '明天 (鎖定)'}</span>
          {!canGoNext ? <Lock className="w-3 h-3 text-[#C83E31]" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Stacked background paper sheets for 3D desk calendar depth */}
      <div className="absolute inset-x-3 top-12 bottom-1 rounded-[26px] bg-[#EAE3D5] border-2 border-[#2D2D2D]/60 translate-y-2.5 rotate-[1.2deg] shadow-md pointer-events-none" />
      <div className="absolute inset-x-1.5 top-11 bottom-2 rounded-[26px] bg-[#F2ECE1] border-2 border-[#2D2D2D]/80 translate-y-1 -rotate-[0.8deg] shadow-md pointer-events-none" />

      {/* Calendar Card Frame: Fixed Top Binder Bar + Perforation Header */}
      <div className="relative shadow-[0_14px_32px_rgba(45,45,45,0.14),0_4px_0_#2D2D2D] rounded-[26px] overflow-hidden">
        {/* 1. Fixed Top Stand Binder Clamp (Sturdy black bar with brass rivets) */}
        <div className="bg-[#2D2D2D] text-[#F9F6F0] px-5 py-2.5 flex items-center justify-between border-2 border-b-0 border-[#2D2D2D] rounded-t-[26px] relative z-20 select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#D4B483] border border-[#F9F6F0]/40 shadow-inner inline-block" />
            <span className="text-[11px] font-sans tracking-[0.2em] text-[#F9F6F0]/80 uppercase">
              GAN-HUA DESK CALENDAR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-sans text-[#D4B483] font-semibold">
              {charMeta.nameZh}
            </span>
            <span className="w-3 h-3 rounded-full bg-[#D4B483] border border-[#F9F6F0]/40 shadow-inner inline-block" />
          </div>
        </div>

        {/* 2. Perforated Binding Stub (Fixed guide strip above the paper page - Grab & pull down to tear) */}
        <div
          onPointerDown={handleStripPointerDown}
          onPointerMove={handleStripPointerMove}
          onPointerUp={handleStripPointerUp}
          onPointerCancel={handleStripPointerUp}
          className={`relative px-5 py-2.5 perforated-line border-x-2 border-[#2D2D2D] flex items-center justify-between z-20 select-none cursor-grab active:cursor-grabbing touch-none transition-colors ${
            !isTodayUnlocked && isPastDate ? 'bg-[#FFF8E7]' : 'bg-[#F3EFE6]'
          }`}
          title="抓住此撕頁虛線向下拉即可撕掉日曆"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-sans">
            <Scissors className={`w-3.5 h-3.5 ${!isTodayUnlocked && isPastDate ? 'text-[#C83E31]' : 'text-[#2D2D2D]/70'}`} />
            <span
              className={
                !isTodayUnlocked && isPastDate
                  ? 'font-black text-[#C83E31] animate-pulse'
                  : 'text-[#6E6A63]'
              }
            >
              {!isTodayUnlocked && isPastDate
                ? '✨ 新的一天！向下拉或左滑撕下舊頁，解鎖今日幹話'
                : isPastDate
                ? '✂️ 撕頁區・向下拉撕頁'
                : '✂️ 撕頁區・今日存活中'}
            </span>
          </div>
          {isPastDate ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerTearForward();
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold transition cursor-pointer shadow-sm relative z-30 ${
                !isTodayUnlocked
                  ? 'bg-[#C83E31] text-[#FAF7F0] ring-2 ring-[#C83E31]/40 animate-pulse hover:bg-[#A93327]'
                  : 'bg-[#2D2D2D] text-[#F9F6F0] hover:bg-[#C83E31]'
              }`}
              title={!isTodayUnlocked ? '親手撕下舊頁，解鎖今日幹話！' : '撕掉此頁，翻向下一天'}
            >
              <span>{!isTodayUnlocked ? '撕頁解鎖今日' : '撕下一頁'}</span>
              <span>{!isTodayUnlocked ? '✂️' : '↘'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playLockedBounceSound();
                onBlockedTomorrow();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2D2D2D]/15 text-[#2D2D2D] text-[11px] font-sans font-bold hover:bg-[#2D2D2D]/25 transition cursor-pointer relative z-30"
              title="今天不可撕頁，明天請待續"
            >
              <span>明天待續</span>
              <Lock className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 3. Stacked Underneath Next Card Preview (Visible during drag or tear-off) */}
        {nextQuotePreview && canGoNext && isPastDate && (
          <div className="absolute inset-x-0 top-[72px] bottom-0 rounded-b-[26px] paper-texture border-2 border-t-0 border-[#2D2D2D] p-5 sm:p-6 flex flex-col justify-between opacity-95 scale-[0.985] shadow-inner pointer-events-none z-0">
            {/* Top Sawtooth subtle torn guide */}
            <div className="text-center pt-2">
              <div className="text-xs font-serif font-black tracking-widest text-[#6E6A63]">
                {nextDateInfo.monthEn} / {nextDateInfo.monthZh} • {nextLunarInfo.lunarMonthDay}
              </div>
              <div className="text-5xl font-serif font-black text-[#2D2D2D] mt-1">
                {nextDateInfo.dayNumber}
              </div>
              <div className="text-xs font-serif font-bold text-[#6E6A63] mt-0.5">
                {nextDateInfo.weekdayZh}
              </div>
            </div>

            <div className="my-auto opacity-75 scale-90 py-2">
              <CharacterIllustration
                character={nextQuotePreview.character}
                artStyle={artStyle}
                spriteSheet={nextQuotePreview.spriteSheet}
                spritePosition={nextQuotePreview.spritePosition}
                sceneId={nextQuotePreview.sceneId}
                assetPath={nextQuotePreview.assetPath}
              />
            </div>

            <div className="text-center pb-2">
              <p className="font-serif font-bold text-base text-[#2D2D2D] line-clamp-2">
                {nextQuotePreview.quote}
              </p>
            </div>
          </div>
        )}

        {/* 4. Active Draggable & Tearable Calendar Sheet (Horizontal swipe for days, native vertical scroll) */}
        <div
          style={{
            touchAction: 'pan-y',
            ...((Math.abs(dragOffsetX) > 0 || dragOffsetY > 0) && !isTearing
              ? {
                  transform: `translate(${dragOffsetX * 0.9}px, ${Math.max(0, dragOffsetY) * 0.65}px) rotate(${dragOffsetX * 0.05 + dragOffsetY * 0.03}deg)`,
                  transformOrigin: 'top left',
                  transition: isPastDate ? 'none' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }
              : {}),
          }}
          className={`relative z-10 rounded-b-[26px] paper-texture border-2 border-t-0 border-[#2D2D2D] overflow-hidden select-none touch-pan-y cursor-grab active:cursor-grabbing ${
            isTearing
              ? tearDirection === 'flip_right'
                ? 'animate-reverse-flip'
                : 'animate-realistic-tear'
              : ''
          }`}
          onPointerDown={handleBodyPointerDown}
          onPointerMove={handleBodyPointerMove}
          onPointerUp={handleBodyPointerUp}
          onPointerCancel={handleBodyPointerUp}
          title={isPastDate ? '向左滑撕頁，向右滑翻回前一日，向下滾動檢視行程' : '今日日曆不可撕頁，向下滑動檢視今日行程'}
        >
          {/* Sawtooth Jagged Tear Edge SVG at the very top of the detached paper sheet */}
          <div className="w-full overflow-hidden h-2 -mt-0.5 pointer-events-none select-none">
            <svg
              className="w-full h-2 text-[#2D2D2D]/25 fill-current"
              viewBox="0 0 380 8"
              preserveAspectRatio="none"
            >
              <path d="M0,0 L8,6 L16,1 L24,7 L32,1 L40,6 L48,2 L56,7 L64,1 L72,6 L80,2 L88,7 L96,1 L104,6 L112,2 L120,7 L128,1 L136,6 L144,2 L152,7 L160,1 L168,6 L176,2 L184,7 L192,1 L200,6 L208,2 L216,7 L224,1 L232,6 L240,2 L248,7 L256,1 L264,6 L272,2 L280,7 L288,1 L296,6 L304,2 L312,7 L320,1 L328,6 L336,2 L344,7 L352,1 L360,6 L368,2 L376,6 L380,0 L380,8 L0,8 Z" />
            </svg>
          </div>

          {/* Card Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Top Brand Calligraphic Header & Special Event Pill Badge */}
            <div className="flex flex-col items-center justify-center gap-1.5 pb-0.5">
              <div className="text-xl sm:text-2xl font-serif font-black tracking-[0.25em] text-[#2D2D2D]">
                幹話日曆
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-center animate-in fade-in">
                {/* 1. Special Event Badge (when roast is active) */}
                {quote.hasRoastOverride && quote.eventLabel && (
                  <span className="px-3 py-0.5 rounded-full bg-[#C83E31] text-white text-[11px] font-serif font-black shadow-sm flex items-center gap-1 tracking-wider border border-[#C83E31]">
                    {quote.eventLabel}
                  </span>
                )}

                {/* 2. Cycle Button (when roast is active and has multiple candidates) */}
                {quote.hasRoastOverride && onCycleSpecialQuote && (quote.specialEventCandidatesCount || 0) > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCycleSpecialQuote();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF7F0] border border-[#C83E31] text-[#C83E31] hover:bg-[#C83E31] hover:text-white text-[10px] font-sans font-bold shadow-sm transition cursor-pointer active:scale-95"
                    title="點擊換一句防禦幹話"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      換一句防禦幹話 ({(quote.specialEventIndex || 0) + 1}/{quote.specialEventCandidatesCount})
                    </span>
                  </button>
                )}

                {/* 3. 1-Tap Toggle Pill: [ 🔀 換回每日原創幹話 ] (when roast is overriding) */}
                {quote.hasRoastOverride && onToggleRoastMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleRoastMode();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF7F0] border border-[#2D2D2D]/25 hover:border-[#2D2D2D] text-[#555] hover:text-[#2D2D2D] text-[10px] font-sans font-bold shadow-xs transition cursor-pointer active:scale-95"
                    title="點擊換回當日 365 每日原創幹話與 54 插畫"
                  >
                    <span>🔀 換回每日原創幹話</span>
                  </button>
                )}

                {/* 4. 1-Tap Toggle Pill: [ 🎒 查看行程吐槽 ] / [ 📅 查看行程吐槽 ] (when normal quote is shown, but roast is available) */}
                {!quote.hasRoastOverride && (quote.roastAvailable || (quote.meetingsCount && quote.meetingsCount > 0)) && onToggleRoastMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleRoastMode();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF8EB] border border-[#C83E31] text-[#C83E31] hover:bg-[#C83E31] hover:text-white text-[10px] font-sans font-bold shadow-xs transition cursor-pointer active:scale-95 animate-in fade-in"
                    title="點擊查看今日行事曆專屬毒舌吐槽"
                  >
                    <span>
                      {quote.availableRoastBadge?.includes('🎒') || (quote.availableRoastBadge?.includes('學校') || quote.availableRoastBadge?.includes('家長'))
                        ? '🎒 查看行程吐槽'
                        : '📅 查看行程吐槽'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Traditional Taiwanese Desk Calendar Date Header (Pixel-perfect to Mockup) */}
            <div className="border-y-2 border-[#2D2D2D] py-2 px-3 bg-[#F9F6F0]/80 flex items-center justify-between">
              {/* Left: Month stacked above Big Day Number with right vertical divider */}
              <div className="flex flex-col items-center justify-center pr-3.5 border-r-2 border-[#2D2D2D]/20 min-w-[68px]">
                <div className="font-serif font-black text-sm text-[#2D2D2D] tracking-wider leading-none">
                  {dateInfo.monthZh}
                </div>
                <div
                  className={`font-serif font-black text-4xl leading-none tracking-tight mt-1 ${
                    dateInfo.isWeekend ? 'text-[#C83E31]' : 'text-[#2D2D2D]'
                  }`}
                >
                  {dateInfo.dayNumber}
                </div>
              </div>

              {/* Right: Weekday + Real Taiwanese Lunar & Solar Term + Expand Calendar Button */}
              <div className="flex-1 pl-3 text-right flex flex-col items-end justify-center gap-1.5">
                <div className="font-serif font-black text-xs text-[#2D2D2D] flex items-center gap-1.5 flex-wrap justify-end">
                  <span className={dateInfo.isWeekend ? 'text-[#C83E31]' : 'text-[#2D2D2D]'}>
                    {dateInfo.weekdayZh}
                  </span>
                  <span className="text-[#6E6A63]/50 font-normal">|</span>
                  <span className="text-[#6E6A63] font-medium">
                    {lunarInfo.fullDisplayText}
                  </span>
                </div>

                {onOpenMonthlyCalendar && (
                  <button
                    type="button"
                    onClick={onOpenMonthlyCalendar}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 text-[#2D2D2D] text-[11px] font-sans font-bold transition cursor-pointer"
                    title="點擊展開桌上型農曆月曆"
                  >
                    <Calendar className="w-3 h-3 text-[#C83E31]" />
                    <span>[ 展開月曆 ▾ ]</span>
                  </button>
                )}
              </div>
            </div>

            {/* Future Date Talisman Seal Mode vs Normal Daily Quote Mode */}
            {isFutureDate ? (
              <div className="space-y-4">
                {/* Taoist Talisman Card */}
                <div className="rounded-2xl border-2 border-[#C83E31] bg-[#FFF8E7] p-6 text-center space-y-3 shadow-inner my-2">
                  <div className="w-20 h-24 mx-auto rounded-xl border-2 border-[#C83E31] bg-[#FCE8B2] flex flex-col items-center justify-between py-2 text-[#C83E31] shadow-sm select-none">
                    <span className="text-xs font-serif font-black tracking-widest">敕令</span>
                    <span className="text-xl font-serif font-black writing-vertical tracking-widest">幹話</span>
                    <span className="text-[10px] font-sans font-bold">封印中</span>
                  </div>
                  <div className="font-serif font-black text-xl text-[#C83E31]">
                    🔮 未來幹話封印中
                  </div>
                  <p className="text-xs font-sans text-[#6E6A63]">
                    （將於當日 00:00 解鎖）
                  </p>
                  <p className="text-xs font-sans text-[#2D2D2D]/70 italic">
                    「命運不可預支，未來的爛事請留到明天再承受。」
                  </p>
                </div>

                {/* 社畜農民曆 */}
                <div className="relative rounded-2xl bg-[#FBF8F2] border-2 border-[#C83E31]/40 p-3 pt-3.5 text-xs font-sans space-y-1.5 shadow-sm">
                  <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-[#C83E31] text-white font-serif font-bold text-[10px] tracking-wider shadow-sm">
                    社畜農民曆
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="font-bold text-[#C83E31]">宜：</span>
                    <span className="text-[#2D2D2D] font-medium">{quote.yi}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#6E6A63]">忌：</span>
                    <span className="text-[#6E6A63] font-medium">{quote.ji}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#785A3C] font-semibold text-[11px] pt-0.5 border-t border-[#2D2D2D]/10">
                    <Clock className="w-3.5 h-3.5 text-[#C83E31]" />
                    <span>摸魚吉時：{lunarInfo.luckySlackTime}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Illustration Window */}
                <div className="relative rounded-2xl bg-[#FAF7F0] border border-[#2D2D2D]/20 py-2 px-3 flex flex-col items-center justify-center overflow-hidden">
                  <CharacterIllustration
                    character={quote.character}
                    variant={quote.illustrationSvg}
                    artStyle={artStyle}
                    spriteSheet={quote.spriteSheet}
                    spritePosition={quote.spritePosition}
                    sceneId={quote.sceneId}
                    assetPath={quote.assetPath}
                  />

                  {/* Stamp: Survived Stamp */}
                  {(isSurvivedToday || isPastDate) && (
                    <div className="animate-stamp absolute right-3 bottom-3 pointer-events-none select-none">
                      <div className="w-24 h-24 rounded-full border-[3px] border-[#C83E31] bg-[#FAF7F0]/90 flex flex-col items-center justify-center text-[#C83E31] shadow-sm p-1">
                        <div className="w-full h-full rounded-full border border-dashed border-[#C83E31] flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-sans font-extrabold tracking-widest">
                            幹話日曆認證
                          </span>
                          <span className="font-serif font-black text-sm leading-tight my-0.5">
                            {isPastDate ? '歷史存檔' : '今日'}
                            <br />
                            已生還
                          </span>
                          <span className="text-[8px] font-mono font-bold">SURVIVED</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Core Sarcastic Quote */}
                <div className="text-center space-y-2 pt-1 px-1">
                  <blockquote className="font-serif font-black text-xl sm:text-2xl leading-snug text-[#2D2D2D] tracking-wide">
                    {quote.quote}
                  </blockquote>
                  <p className="text-xs font-sans text-[#6E6A63] leading-relaxed">
                    {quote.subtext}
                  </p>
                </div>


                {/* 社畜農民曆 (with Real Lunar Lucky Slack Time) */}
                <div className="relative rounded-2xl bg-[#FBF8F2] border-2 border-[#C83E31]/40 p-3 pt-3.5 text-xs font-sans space-y-1.5 shadow-sm">
                  <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-[#C83E31] text-white font-serif font-bold text-[10px] tracking-wider shadow-sm">
                    社畜農民曆
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="font-bold text-[#C83E31]">宜：</span>
                    <span className="text-[#2D2D2D] font-medium truncate">{quote.yi}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#6E6A63]">忌：</span>
                    <span className="text-[#6E6A63] font-medium truncate">{quote.ji}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#785A3C] font-semibold text-[11px] pt-0.5 border-t border-[#2D2D2D]/10">
                    <Clock className="w-3.5 h-3.5 text-[#C83E31]" />
                    <span className="truncate">摸魚吉時：{lunarInfo.luckySlackTime}</span>
                  </div>
                </div>
              </>
            )}

            {/* Card Footer: Actions */}
            <div className="pt-1 flex items-center justify-between border-t border-[#2D2D2D]/15">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(quote.id);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-sans font-bold transition cursor-pointer ${
                    isFavorited
                      ? 'border-[#C83E31] bg-[#C83E31]/10 text-[#C83E31]'
                      : 'border-[#2D2D2D]/20 text-[#6E6A63] hover:text-[#2D2D2D]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-[#C83E31]' : ''}`} />
                  <span>{isFavorited ? '已收藏' : '收藏'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyQuote}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2D2D2D]/20 text-xs font-sans font-bold text-[#6E6A63] hover:text-[#2D2D2D] transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-700">已複製金句</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製幹話</span>
                    </>
                  )}
                </button>
              </div>

              <span className="font-serif font-bold text-xs tracking-wider text-[#6E6A63]/80 flex items-center gap-1.5 select-none" title={`幹話日曆 版本 v${APP_VERSION}`}>
                <span>幹話日曆</span>
                <span className="font-mono text-[10px] text-[#6E6A63]/70 font-semibold bg-[#2D2D2D]/5 px-1.5 py-0.5 rounded border border-[#2D2D2D]/10">v{APP_VERSION}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
