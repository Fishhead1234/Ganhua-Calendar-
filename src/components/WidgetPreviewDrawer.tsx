import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  LayoutTemplate,
  LayoutGrid,
  CalendarDays,
  Monitor,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lock,
  Calendar,
} from 'lucide-react';
import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { CharacterIllustration } from './CharacterIllustration';
import { parseQuoteDateDisplay } from './DeskCalendarCard';
import { getLunarDetails, LunarInfo } from '../utils/lunarUtils';
import { CalendarMeeting } from '../services/calendarService';

interface WidgetPreviewDrawerProps {
  quote: CalendarQuote;
  artStyle: 'original' | 'svg';
  streakCount: number;
  offWorkHour: number;
  survivedDates?: string[];
  activeMeetings?: CalendarMeeting[];
}

type WidgetSizeTab = 'monthly_split' | 'monthly_large' | 'home_medium' | 'ios_lock' | 'notion_embed';

interface CalendarGridCell {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  ymd: string;
  isToday: boolean;
  isPast: boolean;
  lunar: LunarInfo;
}

export const WidgetPreviewDrawer: React.FC<WidgetPreviewDrawerProps> = ({
  quote,
  artStyle,
  streakCount,
  offWorkHour,
  survivedDates = [],
  activeMeetings = [],
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeWidget, setActiveWidget] = useState<WidgetSizeTab>('monthly_split');
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const dateInfo = parseQuoteDateDisplay(quote.date);
  const charMeta = CHARACTER_META[quote.character];

  const now = new Date();
  const lockTimeStr = now.toLocaleTimeString('zh-TW', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  // Base date from current quote
  const baseDate = useMemo(() => {
    try {
      const parts = quote.date.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } catch {
      // ignore
    }
    return new Date();
  }, [quote.date]);

  const viewYear = baseDate.getFullYear();
  const viewMonth = baseDate.getMonth(); // 0-11
  const monthEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][viewMonth];
  const todayYmd = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;

  // Generate 7-column calendar grid for the month
  const calendarCells = useMemo<CalendarGridCell[]>(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: CalendarGridCell[] = [];

    // Leading previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        ymd,
        isToday: ymd === todayYmd,
        isPast: d.getTime() < baseDate.getTime(),
        lunar: getLunarDetails(d),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        date: dateObj,
        dayNum: d,
        isCurrentMonth: true,
        ymd,
        isToday: ymd === todayYmd,
        isPast: dateObj.getTime() < baseDate.getTime(),
        lunar: getLunarDetails(dateObj),
      });
    }

    // Trailing next month days (fill out full 35 or 42 cells)
    const targetLength = cells.length > 35 ? 42 : 35;
    const remaining = targetLength - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        ymd,
        isToday: ymd === todayYmd,
        isPast: false,
        lunar: getLunarDetails(d),
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayYmd, baseDate]);

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
              Android 原生桌面小工具 • iOS • Notion 嵌入
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-sans font-bold text-[#6E6A63]">
            <span>{isOpen ? '收合預覽' : '展開預覽'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isOpen && (
          <div className="p-5 space-y-5">
            {/* Android Native Widget Support Note */}
            <div className="p-3 rounded-2xl bg-[#EAE3D5]/40 border border-[#2D2D2D]/20 text-xs font-sans text-[#2D2D2D] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Android 實體桌面小工具已實裝：</strong>
                  安裝 APK 後，在 Android 手機桌面長按空白處 &gt; 點選「微件/小工具」&gt; 選擇「幹話日曆」即可釘選至手機主畫面！
                </span>
              </div>
            </div>

            {/* 5 Widget Format Switcher Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setActiveWidget('monthly_split')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer ${
                  activeWidget === 'monthly_split'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#D4B483]" />
                <span>4×2 月曆分割</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWidget('monthly_large')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer ${
                  activeWidget === 'monthly_large'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-[#C83E31]" />
                <span>4×4 全月農曆</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWidget('home_medium')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer ${
                  activeWidget === 'home_medium'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>4×2 每日幹話</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWidget('ios_lock')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer ${
                  activeWidget === 'ios_lock'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>鎖定畫面</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWidget('notion_embed')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-sans font-bold transition cursor-pointer col-span-2 sm:col-span-1 ${
                  activeWidget === 'notion_embed'
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                    : 'bg-[#F9F6F0] text-[#2D2D2D] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Notion 嵌入</span>
              </button>
            </div>

            {/* Live Widget Preview Canvas */}
            <div className="rounded-2xl bg-[#EAE3D5]/70 border border-[#2D2D2D]/15 p-5 flex flex-col items-center justify-center min-h-[320px]">
              {/* 1. Medium 4x2 Split Monthly Widget (MonthlySplitWidget) */}
              {activeWidget === 'monthly_split' && (
                <div className="w-full max-w-[420px] space-y-3">
                  <div className="rounded-3xl border border-[#2D2D2D]/20 bg-[#F9F6F0] shadow-md p-3.5 grid grid-cols-12 gap-3 select-none">
                    {/* Left 6 Columns: Header + Compact 7-column mini month grid */}
                    <div className="col-span-6 flex flex-col justify-between">
                      <div className="font-serif font-black text-xs text-[#2D2D2D] tracking-wide mb-1 flex items-center justify-between">
                        <span>{viewYear}年 {viewMonth + 1}月</span>
                        <span className="font-mono text-[10px] text-[#6E6A63] font-bold">{monthEn}</span>
                      </div>

                      {/* 7-column day header */}
                      <div className="grid grid-cols-7 text-center text-[9px] font-serif font-bold text-[#6E6A63] mb-1">
                        <span className="text-[#C83E31]">日</span>
                        <span>一</span>
                        <span>二</span>
                        <span>三</span>
                        <span>四</span>
                        <span>五</span>
                        <span>六</span>
                      </div>

                      {/* Mini 7-column matrix */}
                      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
                        {calendarCells.slice(0, 35).map((cell, idx) => {
                          const isSunday = cell.date.getDay() === 0;
                          return (
                            <div
                              key={idx}
                              className={`text-[9px] font-sans h-4 flex items-center justify-center rounded ${
                                cell.isToday
                                  ? 'bg-[#2D2D2D] text-white font-bold shadow-xs'
                                  : !cell.isCurrentMonth
                                  ? 'text-[#6E6A63]/30'
                                  : isSunday
                                  ? 'text-[#C83E31]'
                                  : 'text-[#2D2D2D]'
                              }`}
                            >
                              {cell.dayNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right 6 Columns: Date + Gàn-huà Quote + Character + Red Stamp */}
                    <div className="col-span-6 border-l border-stone-300 pl-3 flex flex-col justify-between">
                      {/* Top: 10/31 星期六 (農曆九月廿二) */}
                      <div className="border-b border-stone-200 pb-1">
                        <div className="flex items-baseline justify-between">
                          <span className="font-serif font-black text-xs text-[#2D2D2D]">
                            {viewMonth + 1}/{dateInfo.dayNumber} {dateInfo.weekdayZh}
                          </span>
                        </div>
                        <div className="text-[10px] font-sans text-[#6E6A63] font-medium leading-none mt-0.5">
                          ({getLunarDetails(baseDate).lunarMonthDay})
                        </div>
                      </div>

                      {/* Middle: Gàn-huà quote in bold serif */}
                      <p className="font-serif font-bold text-xs leading-snug line-clamp-3 text-[#2D2D2D] my-1.5">
                        「{quote.quote}」
                      </p>

                      {/* Bottom: Mini character illustration + red tilted 已生還 stamp */}
                      <div className="flex items-end justify-between pt-0.5">
                        <div className="w-12 h-12 shrink-0">
                          <CharacterIllustration
                            character={quote.character}
                            artStyle={artStyle}
                            spriteSheet={quote.spriteSheet}
                            spritePosition={quote.spritePosition}
                            sceneId={quote.sceneId}
                            assetPath={quote.assetPath}
                            compact
                            className="!w-12 !h-12"
                          />
                        </div>

                        <div className="rotate-[-8deg] px-1.5 py-0.5 rounded border-2 border-[#C83E31] text-[#C83E31] font-serif font-black text-[10px] tracking-widest shadow-xs bg-[#FAF7F0]/90">
                          已生還
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs font-sans text-[#6E6A63]">
                    4×2 中型月曆分割桌面小工具預覽 (iOS / Android)
                  </p>
                </div>
              )}

              {/* 2. Large 4x4 Full Monthly + Gàn-huà Widget (MonthlyLargeWidget) */}
              {activeWidget === 'monthly_large' && (
                <div className="w-full max-w-[370px] space-y-3">
                  <div className="rounded-3xl bg-[#F9F6F0] overflow-hidden shadow-lg border border-[#2D2D2D]/15 flex flex-col select-none">
                    {/* Top Bar */}
                    <div className="bg-[#2D2D2D] text-[#F9F6F0] px-4 py-2.5 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D4B483]" />
                        <span className="font-serif font-black text-xs sm:text-sm tracking-wide text-[#F9F6F0]">
                          {viewYear}年 {viewMonth + 1}月 {monthEn}
                        </span>
                      </div>
                      <span className="font-serif text-[11px] text-[#D4B483] tracking-tight">
                        {getLunarDetails(baseDate).fullDisplayText}
                      </span>
                    </div>

                    {/* Center Section: 7-Column Lunar Monthly Grid */}
                    <div className="p-3 bg-[#FAF7F0]">
                      {/* Weekday Header */}
                      <div className="grid grid-cols-7 text-center font-serif font-black text-[10px] pb-1.5 border-b border-[#2D2D2D]/10">
                        <span className="text-[#C83E31]">日</span>
                        <span className="text-[#2D2D2D]">一</span>
                        <span className="text-[#2D2D2D]">二</span>
                        <span className="text-[#2D2D2D]">三</span>
                        <span className="text-[#2D2D2D]">四</span>
                        <span className="text-[#2D2D2D]">五</span>
                        <span className="text-[#6E6A63]">六</span>
                      </div>

                      {/* 7-Column Matrix */}
                      <div className="grid grid-cols-7 gap-1 pt-1.5">
                        {calendarCells.slice(0, 35).map((cell, idx) => {
                          const isSunday = cell.date.getDay() === 0;
                          const hasSurvived = survivedDates.includes(cell.ymd);

                          // Sub-label logic: Holiday / 節氣 > 初一 > 農曆日
                          let subText = cell.lunar.lunarDayName;
                          let isHighlight = false;
                          if (cell.lunar.taiwanHoliday) {
                            subText = cell.lunar.taiwanHoliday.slice(0, 2);
                            isHighlight = true;
                          } else if (cell.lunar.solarTerm) {
                            subText = cell.lunar.solarTerm;
                            isHighlight = true;
                          } else if (cell.lunar.lunarDayNum === 1 || cell.lunar.lunarDayName === '初一') {
                            subText = cell.lunar.lunarMonthName;
                          }

                          return (
                            <div
                              key={idx}
                              className={`relative flex flex-col items-center justify-center py-1 rounded-lg transition ${
                                cell.isToday
                                  ? 'bg-[#2D2D2D] text-white font-bold shadow-xs'
                                  : !cell.isCurrentMonth
                                  ? 'text-[#6E6A63]/30'
                                  : 'text-[#2D2D2D]'
                              }`}
                            >
                              {/* Tiny survived watermark stamp */}
                              {hasSurvived && !cell.isToday && cell.isCurrentMonth && (
                                <span className="absolute -top-1 -right-0.5 text-[7px] font-serif font-black text-[#C83E31] scale-75 border border-[#C83E31]/60 rounded px-0.5 leading-none bg-white/70">
                                  生還
                                </span>
                              )}

                              {/* Solar Day Number */}
                              <span
                                className={`font-serif font-black text-xs leading-none ${
                                  cell.isToday
                                    ? 'text-white'
                                    : isSunday
                                    ? 'text-[#C83E31]'
                                    : 'text-[#2D2D2D]'
                                }`}
                              >
                                {cell.dayNum}
                              </span>

                              {/* Lunar / Solar Term Sub-label */}
                              <span
                                className={`text-[8px] font-sans truncate max-w-full scale-90 leading-tight mt-0.5 ${
                                  cell.isToday
                                    ? 'text-[#D4B483]'
                                    : isHighlight
                                    ? 'text-[#C83E31] font-bold'
                                    : 'text-[#6E6A63]'
                                }`}
                              >
                                {subText}
                              </span>

                              {/* Today Meeting Dot Indicator */}
                              {cell.isToday && (
                                <span className="w-1 h-1 rounded-full bg-[#C83E31] mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Footer Strip */}
                    <div className="border-t border-stone-300/80 p-2.5 px-3 flex items-center gap-3 bg-[#F5F0E6] shrink-0">
                      <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-white/60 border border-[#2D2D2D]/15 flex items-center justify-center p-1">
                        <CharacterIllustration
                          character={quote.character}
                          artStyle={artStyle}
                          spriteSheet={quote.spriteSheet}
                          spritePosition={quote.spritePosition}
                          sceneId={quote.sceneId}
                          assetPath={quote.assetPath}
                          compact
                          className="!w-14 !h-14"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-serif font-black text-xs sm:text-sm text-[#2D2D2D] leading-snug line-clamp-2">
                          「{quote.quote}」
                        </p>

                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-sans pt-0.5">
                          <span className="text-[#C83E31] font-bold truncate">
                            宜：{quote.yi ? quote.yi.split('・')[0] : '帶薪拉屎'}
                          </span>
                          <span className="text-[#6E6A63] font-medium flex items-center gap-1 shrink-0">
                            <span>📅 今日 {activeMeetings.length} 場會議</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs font-sans text-[#6E6A63]">
                    4×4 大型全月農曆桌面小工具預覽 (iOS / Android)
                  </p>
                </div>
              )}

              {/* 3. Medium Home Screen Widget (Date + Mini doodle + Quote) */}
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
                        spriteSheet={quote.spriteSheet}
                        spritePosition={quote.spritePosition}
                        sceneId={quote.sceneId}
                        assetPath={quote.assetPath}
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
                    iOS / Android 主畫面 4×2 中型每日幹話小工具預覽
                  </p>
                </div>
              )}

              {/* 4. iOS Lock Screen Inline Widget + Rectangular Widget */}
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

              {/* 5. Notion / Web Desktop Embed */}
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
                          spriteSheet={quote.spriteSheet}
                          spritePosition={quote.spritePosition}
                          sceneId={quote.sceneId}
                          assetPath={quote.assetPath}
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
                        <p className="text-xs font-sans text-[#6E6A63]">
                          {quote.subtext}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs font-sans text-[#6E6A63]">
                    支援 Notion <code>/embed</code> 區塊、Obsidian 或個人網頁嵌入
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
