import React, { useState } from 'react';
import {
  Smartphone,
  LayoutTemplate,
  Monitor,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { CharacterIllustration } from './CharacterIllustration';
import { parseQuoteDateDisplay } from './DeskCalendarCard';

interface WidgetPreviewDrawerProps {
  quote: CalendarQuote;
  artStyle: 'original' | 'svg';
  streakCount: number;
  offWorkHour: number;
}

type WidgetSizeTab = 'ios_lock' | 'home_medium' | 'notion_embed';

export const WidgetPreviewDrawer: React.FC<WidgetPreviewDrawerProps> = ({
  quote,
  artStyle,
  streakCount,
  offWorkHour,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeWidget, setActiveWidget] = useState<WidgetSizeTab>('ios_lock');
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const dateInfo = parseQuoteDateDisplay(quote.date);
  const charMeta = CHARACTER_META[quote.character];

  const now = new Date();
  const lockTimeStr = now.toLocaleTimeString('zh-TW', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyNotionEmbed = async () => {
    const embedUrl = `${window.location.origin}${window.location.pathname}?embed=1&character=${quote.character}`;
    try {
      await navigator.clipboard.writeText(embedUrl);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2400);
    } catch {
      // ignore
    }
  };

  return (
    <section className="w-full max-w-3xl mx-auto mt-6">
      <div className="rounded-3xl bg-[#FAF7F0] border-2 border-[#2D2D2D] shadow-[0_6px_0_#2D2D2D] overflow-hidden">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-5 py-3.5 bg-[#F3EFE6] hover:bg-[#EAE3D5] border-b border-[#2D2D2D]/20 flex items-center justify-between transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-[#2D2D2D]" />
            <span className="font-serif font-black text-sm sm:text-base text-[#2D2D2D]">
              桌面小工具預覽器 (Widget Preview Drawer)
            </span>
            <span className="hidden sm:inline-block text-[11px] font-sans px-2 py-0.5 rounded-full bg-[#2D2D2D] text-[#F9F6F0] font-bold">
              iOS 鎖定畫面 • 主畫面 2×4 • Notion 嵌入
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-sans font-bold text-[#6E6A63]">
            <span>{isOpen ? '收合預覽' : '展開預覽'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isOpen && (
          <div className="p-5 space-y-5">
            {/* 3 Widget Format Switcher Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveWidget('ios_lock')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer ${
                  activeWidget === 'ios_lock'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>a) iOS 鎖定畫面 Widget</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWidget('home_medium')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer ${
                  activeWidget === 'home_medium'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>b) 主畫面中型 Widget (2×4)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWidget('notion_embed')}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer ${
                  activeWidget === 'notion_embed'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>c) Notion / 網頁桌面嵌入</span>
              </button>
            </div>

            {/* Live Widget Preview Canvas */}
            <div className="rounded-2xl bg-[#EAE3D5]/70 border border-[#2D2D2D]/15 p-5 flex flex-col items-center justify-center min-h-[290px]">
              {/* a) iOS Lock Screen Inline Widget + Rectangular Widget */}
              {activeWidget === 'ios_lock' && (
                <div className="w-full max-w-[320px] rounded-[36px] bg-gradient-to-b from-[#2B2927] via-[#3A3530] to-[#1F1D1B] text-[#F9F6F0] p-5 shadow-2xl border-[4px] border-[#4A453F] space-y-4">
                  {/* Dynamic Island */}
                  <div className="w-24 h-5 rounded-full bg-black mx-auto" />

                  {/* 1. iOS Inline Lock Screen Widget (Above Clock) */}
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-sans font-semibold text-[#F9F6F0]/95 max-w-full truncate">
                      <span>{charMeta.badge.split(' ')[0]}</span>
                      <span className="truncate">{quote.quote}</span>
                    </div>

                    {/* Big iOS Lock Screen Clock */}
                    <div className="font-sans font-extrabold text-6xl tracking-tight text-[#F9F6F0]/95 leading-none pt-1">
                      {lockTimeStr}
                    </div>
                  </div>

                  {/* 2. iOS Lock Screen Rectangular Widget + Circular Streak Gauge */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="col-span-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] font-sans text-[#F9F6F0]/75">
                        <span className="font-bold">幹話日曆 • {dateInfo.monthZh}{dateInfo.dayNumber}日</span>
                        <span>{charMeta.nameZh}</span>
                      </div>
                      <p className="font-serif font-bold text-xs leading-snug text-white mt-1 line-clamp-2">
                        「{quote.quote}」
                      </p>
                    </div>

                    <div className="col-span-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-2.5 flex flex-col items-center justify-center text-center">
                      <div className="w-11 h-11 rounded-full border-2 border-[#D4B483] flex flex-col items-center justify-center">
                        <span className="font-mono font-black text-xs text-white">
                          {streakCount}d
                        </span>
                      </div>
                      <span className="text-[9px] font-sans text-[#F9F6F0]/80 mt-1">
                        平安下班
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* b) Medium Home Screen Widget (Date + Mini doodle + Quote) */}
              {activeWidget === 'home_medium' && (
                <div className="w-full max-w-[380px] space-y-3">
                  <div className="rounded-[28px] paper-texture border-2 border-[#2D2D2D] p-4 shadow-[0_12px_28px_rgba(45,45,45,0.16)] flex items-center gap-3.5">
                    {/* Left Column: Date + Mini Character Doodle */}
                    <div className="w-24 shrink-0 flex flex-col items-center border-r border-[#2D2D2D]/20 pr-3">
                      <div className="text-[10px] font-mono font-extrabold text-[#6E6A63] tracking-widest">
                        {dateInfo.monthEn} • {dateInfo.weekdayEn}
                      </div>
                      <div className="font-serif font-black text-3xl text-[#2D2D2D] leading-none my-0.5">
                        {dateInfo.dayNumber}
                      </div>
                      <CharacterIllustration
                        character={quote.character}
                        artStyle={artStyle}
                        compact
                      />
                    </div>

                    {/* Right Column: Quote + Subtext + Survival Progress */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#2D2D2D] text-[#F9F6F0]">
                          {charMeta.badge}
                        </span>
                        <span className="text-[10px] font-serif font-bold text-[#6E6A63]">
                          幹話日曆
                        </span>
                      </div>

                      <p className="font-serif font-black text-sm sm:text-base leading-snug text-[#2D2D2D]">
                        {quote.quote}
                      </p>

                      <div className="text-[11px] font-sans text-[#6E6A63] truncate">
                        宜：{quote.yi}
                      </div>

                      <div className="pt-1 border-t border-[#2D2D2D]/15 flex items-center justify-between text-[10px] font-sans text-[#6E6A63]">
                        <span>目標 {offWorkHour}:00 下班</span>
                        <span className="font-bold text-[#C83E31]">
                          🔥 連續生還 {streakCount} 天
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs font-sans text-[#6E6A63]">
                    iOS / Android 主畫面 2×4 中型桌面小工具預覽
                  </p>
                </div>
              )}

              {/* c) Notion / Web Desktop Embed */}
              {activeWidget === 'notion_embed' && (
                <div className="w-full max-w-lg space-y-3">
                  <div className="rounded-2xl bg-white border border-[#2D2D2D]/20 p-4 shadow-md">
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#2D2D2D]/10 text-xs font-sans text-[#6E6A63]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C83E31]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#D4B483]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59]" />
                        <span className="ml-1 font-mono text-[11px]">
                          Notion / Desktop Embed Block
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyNotionEmbed}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D2D2D] text-[#F9F6F0] text-[11px] font-bold cursor-pointer hover:bg-[#C83E31] transition"
                      >
                        {copiedEmbed ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>已複製 Notion 嵌入網址</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>複製 Notion Embed 連結</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Compact Notion Card */}
                    <div className="rounded-2xl paper-texture border-2 border-[#2D2D2D] p-4 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-28 shrink-0">
                        <CharacterIllustration
                          character={quote.character}
                          artStyle={artStyle}
                          className="!h-28"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left space-y-1.5">
                        <div className="text-[11px] font-sans font-bold text-[#6E6A63]">
                          {dateInfo.monthEn} {dateInfo.dayNumber} ({dateInfo.weekdayZh}) • {quote.lunarDate}
                        </div>
                        <div className="font-serif font-black text-lg text-[#2D2D2D] leading-snug">
                          「{quote.quote}」
                        </div>
                        <div className="text-xs font-sans text-[#6E6A63]">
                          {quote.subtext}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

