import React, { useState, useRef } from 'react';
import { Heart, Copy, Check, Scissors, Sparkles } from 'lucide-react';
import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { CharacterIllustration } from './CharacterIllustration';

interface DeskCalendarCardProps {
  quote: CalendarQuote;
  nextQuotePreview?: CalendarQuote;
  artStyle: 'original' | 'svg';
  isSurvivedToday: boolean;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onTearOff: () => void;
}

const MONTH_EN_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

const WEEKDAY_ZH_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WEEKDAY_EN_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function parseQuoteDateDisplay(dateStr: string) {
  const parts = dateStr.split('-').map(Number);
  const dt =
    parts.length === 3 && !isNaN(parts[0])
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();
  const mIdx = dt.getMonth();
  const wIdx = dt.getDay();
  return {
    monthEn: MONTH_EN_NAMES[mIdx] || 'OCT',
    monthZh: `${mIdx + 1}月`,
    dayNumber: String(dt.getDate()).padStart(2, '0'),
    weekdayZh: WEEKDAY_ZH_NAMES[wIdx] || '星期四',
    weekdayEn: WEEKDAY_EN_NAMES[wIdx] || 'THU',
    isWeekend: wIdx === 0 || wIdx === 6,
  };
}

export const DeskCalendarCard: React.FC<DeskCalendarCardProps> = ({
  quote,
  nextQuotePreview,
  artStyle,
  isSurvivedToday,
  isFavorited,
  onToggleFavorite,
  onTearOff,
}) => {
  const [isTearing, setIsTearing] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [copied, setCopied] = useState(false);
  const dragStartY = useRef<number | null>(null);

  const dateInfo = parseQuoteDateDisplay(quote.date);
  const nextDateInfo = nextQuotePreview ? parseQuoteDateDisplay(nextQuotePreview.date) : dateInfo;
  const charMeta = CHARACTER_META[quote.character];

  const triggerTearAnimation = () => {
    if (isTearing) return;
    setIsTearing(true);
    setDragOffsetY(0);
    onTearOff();
    setTimeout(() => {
      setIsTearing(false);
    }, 560);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore clicks on buttons inside the card
    if ((e.target as HTMLElement).closest('button')) return;
    dragStartY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null || isTearing) return;
    const deltaY = e.clientY - dragStartY.current;
    if (deltaY > 0) {
      setDragOffsetY(Math.min(deltaY, 150));
    }
  };

  const handlePointerUp = () => {
    if (dragStartY.current === null) return;
    if (dragOffsetY > 65) {
      triggerTearAnimation();
    } else {
      setDragOffsetY(0);
    }
    dragStartY.current = null;
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
    <div className="relative w-full max-w-[390px] mx-auto select-none pt-2 pb-4">
      {/* Stacked background paper sheets for 3D desk calendar depth */}
      <div className="absolute inset-x-3 top-6 bottom-1 rounded-[26px] bg-[#EAE3D5] border-2 border-[#2D2D2D]/60 translate-y-2.5 rotate-[1.2deg] shadow-md pointer-events-none" />
      <div className="absolute inset-x-1.5 top-5 bottom-2 rounded-[26px] bg-[#F2ECE1] border-2 border-[#2D2D2D]/80 translate-y-1 -rotate-[0.8deg] shadow-md pointer-events-none" />

      {/* Underneath "Tomorrow / Next Card" Preview visible during tear-off */}
      {nextQuotePreview && (
        <div className="absolute inset-x-0 top-2 bottom-4 rounded-[26px] paper-texture border-2 border-[#2D2D2D] p-6 flex flex-col justify-between opacity-90 pointer-events-none">
          <div className="pt-8 text-center">
            <div className="text-xs font-sans font-bold tracking-widest text-[#6E6A63]">
              {nextDateInfo.monthEn} / {nextDateInfo.monthZh} • {nextQuotePreview.lunarDate}
            </div>
            <div className="text-5xl font-serif font-black text-[#2D2D2D] mt-1">
              {nextDateInfo.dayNumber}
            </div>
          </div>
          <div className="my-auto opacity-60 scale-95">
            <CharacterIllustration
              character={nextQuotePreview.character}
              artStyle={artStyle}
              spriteSheet={nextQuotePreview.spriteSheet}
              spritePosition={nextQuotePreview.spritePosition}
              sceneId={nextQuotePreview.sceneId}
              assetPath={nextQuotePreview.assetPath}
            />
          </div>
          <div className="text-center pb-4">
            <p className="font-serif font-bold text-lg text-[#2D2D2D]">
              {nextQuotePreview.quote}
            </p>
          </div>
        </div>
      )}

      {/* Main Active Desk Calendar Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={
          dragOffsetY > 0 && !isTearing
            ? {
                transform: `translateY(${dragOffsetY * 0.65}px) rotate(${dragOffsetY * 0.04}deg)`,
                transition: 'none',
              }
            : undefined
        }
        className={`relative rounded-[26px] paper-texture border-2 border-[#2D2D2D] shadow-[0_14px_32px_rgba(45,45,45,0.12),0_4px_0_#2D2D2D] overflow-hidden transition-transform duration-200 cursor-grab active:cursor-grabbing ${
          isTearing ? 'animate-tear-off pointer-events-none' : ''
        }`}
      >
        {/* Top Calendar Stand Binding Block & Brass Rivets */}
        <div className="bg-[#2D2D2D] text-[#F9F6F0] px-5 py-2.5 flex items-center justify-between">
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

        {/* Perforated Tear Line + Interactive Tear Button */}
        <div className="relative px-5 py-2 bg-[#F3EFE6] perforated-line flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-[#6E6A63]">
            <Scissors className="w-3.5 h-3.5 text-[#2D2D2D]/70" />
            <span>往下滑動或點擊撕下一頁</span>
          </div>
          <button
            type="button"
            onClick={triggerTearAnimation}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2D2D2D] text-[#F9F6F0] text-[11px] font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer shadow-sm"
          >
            <span>撕下一頁</span>
            <span>↘</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Top Brand Calligraphic Header + Date Grid */}
          <div className="text-center pb-1">
            <div className="text-xl sm:text-2xl font-serif font-black tracking-[0.25em] text-[#2D2D2D]">
              幹話日曆
            </div>
          </div>

          {/* Traditional Taiwanese Calendar Date Header */}
          <div className="grid grid-cols-3 items-center border-y-2 border-[#2D2D2D] py-2.5 px-2 bg-[#F9F6F0]/60">
            {/* Left: Month & Character Tag */}
            <div className="text-left border-r border-[#2D2D2D]/25 pr-2">
              <div className="font-mono font-extrabold text-xs tracking-widest text-[#6E6A63]">
                {dateInfo.monthEn}
              </div>
              <div className="font-serif font-black text-lg text-[#2D2D2D] leading-tight">
                {dateInfo.monthZh}
              </div>
              <div className="text-[11px] font-sans text-[#6E6A63] mt-0.5">
                {quote.lunarDate}
              </div>
            </div>

            {/* Center: Large Bold Serif Day Number */}
            <div className="text-center px-1">
              <div
                className={`font-serif font-black text-5xl sm:text-6xl leading-none tracking-tight ${
                  dateInfo.isWeekend ? 'text-[#C83E31]' : 'text-[#2D2D2D]'
                }`}
              >
                {dateInfo.dayNumber}
              </div>
            </div>

            {/* Right: Weekday & Category */}
            <div className="text-right border-l border-[#2D2D2D]/25 pl-2">
              <div className="font-mono font-extrabold text-xs tracking-widest text-[#6E6A63]">
                {dateInfo.weekdayEn}
              </div>
              <div
                className={`font-serif font-black text-base leading-tight ${
                  dateInfo.isWeekend ? 'text-[#C83E31]' : 'text-[#2D2D2D]'
                }`}
              >
                {dateInfo.weekdayZh}
              </div>
              <div className="text-[11px] font-sans font-bold text-[#6E6A63] mt-0.5">
                {quote.category === 'workplace'
                  ? '職場生存'
                  : quote.category === 'laziness'
                  ? '躺平哲學'
                  : '社交歸零'}
              </div>
            </div>
          </div>

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

            {/* Red "Survived Today" Stamp Seal Overlay */}
            {isSurvivedToday && (
              <div className="animate-stamp absolute right-3 bottom-3 pointer-events-none select-none">
                <div className="w-24 h-24 rounded-full border-[3px] border-[#C83E31] bg-[#FAF7F0]/90 flex flex-col items-center justify-center text-[#C83E31] shadow-sm p-1">
                  <div className="w-full h-full rounded-full border border-dashed border-[#C83E31] flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-sans font-extrabold tracking-widest">
                      幹話日曆認證
                    </span>
                    <span className="font-serif font-black text-sm leading-tight my-0.5">
                      今日已
                      <br />
                      平安下班
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

          {/* Sarcastic 宜 / 忌 Daily Office Almanac */}
          <div className="rounded-xl bg-[#F3EFE6] border border-[#2D2D2D]/20 p-2.5 text-xs font-sans space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2D2D2D] text-[#F9F6F0] font-serif font-bold text-[11px] flex items-center justify-center shrink-0">
                宜
              </span>
              <span className="text-[#2D2D2D] font-medium truncate">{quote.yi}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#C83E31] text-white font-serif font-bold text-[11px] flex items-center justify-center shrink-0">
                忌
              </span>
              <span className="text-[#6E6A63] truncate">{quote.ji}</span>
            </div>
          </div>

          {/* Card Footer: Watermark + Favorite & Copy Actions */}
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

            <span className="font-serif font-bold text-sm tracking-[0.2em] text-[#6E6A63]/80">
              幹話日曆
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

