import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Calendar,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  Plus,
  Edit2,
} from 'lucide-react';
import { getLunarDetails, LunarInfo } from '../utils/lunarUtils';
import { CalendarMeeting, CustomCalendarEvent, customEventToMeeting } from '../services/calendarService';
import quotes365Raw from '../data/quotes365.json';
import { formatQuoteFrom365 } from '../hooks/useTodayQuote';
import { CharacterIllustration } from './CharacterIllustration';
import { RawStaticQuote365, CharacterType, CalendarQuote } from '../types/calendar';

interface MonthlyCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
  today?: Date;
  survivedDates?: string[];
  activeMeetings?: CalendarMeeting[];
  customEvents?: CustomCalendarEvent[];
  quotes?: RawStaticQuote365[];
  onSelectDate: (targetDate: Date) => void;
  onOpenAddEvent?: (dateStr: string) => void;
  onEditEvent?: (event: CalendarMeeting) => void;
}

export const MonthlyCalendarModal: React.FC<MonthlyCalendarModalProps> = ({
  isOpen,
  onClose,
  currentDate = new Date(),
  today = new Date(),
  survivedDates = [],
  activeMeetings = [],
  customEvents = [],
  quotes,
  onSelectDate,
  onOpenAddEvent,
  onEditEvent,
}) => {
  // Validate and sanitize dates
  const safeCurrentDate = useMemo(() => {
    return currentDate instanceof Date && !isNaN(currentDate.getTime()) ? currentDate : new Date();
  }, [currentDate]);

  const safeToday = useMemo(() => {
    return today instanceof Date && !isNaN(today.getTime()) ? today : new Date();
  }, [today]);

  const [viewYear, setViewYear] = useState<number>(() => safeCurrentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => safeCurrentDate.getMonth()); // 0-11
  const [pickedDate, setPickedDate] = useState<Date>(() => safeCurrentDate);

  // Sync state when opening with updated currentDate
  useEffect(() => {
    if (isOpen) {
      const valid = safeCurrentDate;
      setViewYear(valid.getFullYear());
      setViewMonth(valid.getMonth());
      setPickedDate(valid);
    }
  }, [isOpen, safeCurrentDate]);

  const todayMidnight = useMemo(() => {
    return new Date(safeToday.getFullYear(), safeToday.getMonth(), safeToday.getDate());
  }, [safeToday]);

  const pickedMidnight = useMemo(() => {
    return new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());
  }, [pickedDate]);

  const isPickedFuture = pickedMidnight.getTime() > todayMidnight.getTime();
  const isPickedToday = pickedMidnight.getTime() === todayMidnight.getTime();

  const pickedDateStr = useMemo(() => {
    const y = pickedDate.getFullYear();
    const m = String(pickedDate.getMonth() + 1).padStart(2, '0');
    const d = String(pickedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [pickedDate]);

  const pickedDayEvents = useMemo<CalendarMeeting[]>(() => {
    const customForDate = (customEvents || [])
      .filter((e) => e.dateKey === pickedDateStr)
      .map(customEventToMeeting);

    const syncedForDate = isPickedToday
      ? (activeMeetings || []).filter((m) => m.source !== 'local')
      : [];

    const merged = [...syncedForDate, ...customForDate];
    merged.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
    return merged;
  }, [customEvents, pickedDateStr, isPickedToday, activeMeetings]);

  // Find Gàn-huà quote and illustration for selected date with strict fallback
  const pickedMonth = pickedDate.getMonth() + 1;
  const pickedDay = pickedDate.getDate();
  const pickedQuote = useMemo<CalendarQuote>(() => {
    try {
      const list = (quotes && quotes.length > 0 ? quotes : (quotes365Raw as RawStaticQuote365[])) || [];
      const found = list.find((q) => q && q.month === pickedMonth && q.day === pickedDay) || list[0];
      if (found) {
        return formatQuoteFrom365(found, pickedDate);
      }
    } catch (err) {
      console.warn('Error resolving picked quote in MonthlyCalendarModal:', err);
    }

    return {
      id: `fallback-${pickedMonth}-${pickedDay}`,
      date: `${pickedDate.getFullYear()}-${String(pickedMonth).padStart(2, '0')}-${String(pickedDay).padStart(2, '0')}`,
      month: pickedMonth,
      day: pickedDay,
      quote: '今天行事曆一片淨土，適合安靜當個薪水小偷。',
      subtext: '沒有會議就是最好的會議，趁主管沒發現前靜靜地把薪水領走。',
      character: 'cat',
      category: 'workplace',
      lunarDate: '農曆九月廿二',
      yi: '帶薪上廁所・安靜地當一塊沒用的爛泥',
      ji: '在群組問「今天大家好像很閒」',
      illustrationSvg: 'cat_svg',
      sceneId: 'cat_coffee',
      assetPath: '/assets/scenes/cat_coffee.webp',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '0% 0%',
    };
  }, [quotes, pickedMonth, pickedDay, pickedDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setPickedDate(t);
  };

  const formatEventTime = (m: CalendarMeeting) => {
    if (m?.isAllDay) return '全天';
    const hourStr = String(m?.startHour ?? 9).padStart(2, '0');
    const minStr = String(m?.startMinute ?? 0).padStart(2, '0');
    return `${hourStr}:${minStr}`;
  };

  // Generate 7-column calendar matrix safely
  const calendarCells = useMemo(() => {
    const cells: {
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      ymd: string;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
      lunar: LunarInfo;
    }[] = [];

    try {
      const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
      const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

      // Previous month padding
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        cells.push({
          date: d,
          dayNum: d.getDate(),
          isCurrentMonth: false,
          ymd,
          isToday: false,
          isPast: d.getTime() < todayMidnight.getTime(),
          isFuture: d.getTime() > todayMidnight.getTime(),
          lunar: getLunarDetails(d),
        });
      }

      // Current month days
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(viewYear, viewMonth, d);
        const ymd = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateObj.getTime() === todayMidnight.getTime();
        cells.push({
          date: dateObj,
          dayNum: d,
          isCurrentMonth: true,
          ymd,
          isToday,
          isPast: dateObj.getTime() < todayMidnight.getTime(),
          isFuture: dateObj.getTime() > todayMidnight.getTime(),
          lunar: getLunarDetails(dateObj),
        });
      }

      // Next month padding to complete row of 7
      const remaining = (7 - (cells.length % 7)) % 7;
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(viewYear, viewMonth + 1, i);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        cells.push({
          date: d,
          dayNum: d.getDate(),
          isCurrentMonth: false,
          ymd,
          isToday: false,
          isPast: d.getTime() < todayMidnight.getTime(),
          isFuture: d.getTime() > todayMidnight.getTime(),
          lunar: getLunarDetails(d),
        });
      }
    } catch (err) {
      console.warn('Error generating calendar cells in MonthlyCalendarModal:', err);
    }

    return cells;
  }, [viewYear, viewMonth, todayMidnight]);

  const pickedLunar = useMemo(() => getLunarDetails(pickedDate), [pickedDate]);
  const pickedWeekdayZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][pickedDate.getDay()] || '星期六';
  const pickedYmd = `${pickedDate.getFullYear()}-${String(pickedDate.getMonth() + 1).padStart(2, '0')}-${String(pickedDate.getDate()).padStart(2, '0')}`;
  const isPickedSurvived = Boolean(survivedDates && survivedDates.includes(pickedYmd));

  const handleConfirmSelect = () => {
    onSelectDate(pickedDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-[420px] max-h-[92vh] flex flex-col rounded-3xl paper-texture border-2 border-[#2D2D2D] shadow-2xl bg-[#FAF7F0] overflow-hidden select-none">
        {/* Top Stand Header */}
        <div className="bg-[#2D2D2D] text-[#F9F6F0] px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4B483]" />
            <span className="font-serif font-black text-sm tracking-wider text-[#F9F6F0]">
              桌上型農曆月曆
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#F9F6F0] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto px-4 py-3 space-y-3.5">
          {/* Month Navigation Bar */}
          <div className="flex items-center justify-between border-b border-[#2D2D2D]/15 pb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-[#2D2D2D]/20 hover:bg-[#2D2D2D]/10 text-[#2D2D2D] transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="font-serif font-black text-lg text-[#2D2D2D] tracking-wide">
                {viewYear}年 {viewMonth + 1}月
              </span>
              <span className="font-mono text-xs text-[#6E6A63] ml-2 font-bold">
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][viewMonth]}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleJumpToToday}
                className="text-[11px] font-sans font-bold px-2 py-1 rounded-md bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 text-[#2D2D2D] transition cursor-pointer"
              >
                今日
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-[#2D2D2D]/20 hover:bg-[#2D2D2D]/10 text-[#2D2D2D] transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7-Column Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-serif font-black text-xs">
            <div className="text-[#C83E31]">日</div>
            <div className="text-[#2D2D2D]">一</div>
            <div className="text-[#2D2D2D]">二</div>
            <div className="text-[#2D2D2D]">三</div>
            <div className="text-[#2D2D2D]">四</div>
            <div className="text-[#2D2D2D]">五</div>
            <div className="text-[#6E6A63]">六</div>
          </div>

          {/* Monthly Date Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSelected =
                cell.date.getFullYear() === pickedDate.getFullYear() &&
                cell.date.getMonth() === pickedDate.getMonth() &&
                cell.date.getDate() === pickedDate.getDate();

              const hasSurvived = Boolean(survivedDates && survivedDates.includes(cell.ymd));
              const isSunday = cell.date.getDay() === 0;

              // Determine exact sub-label:
              // 1. Holiday or 24 節氣 on exact single date (in red)
              // 2. 初一 shows lunar month name (e.g. 九月, 十月)
              // 3. Otherwise lunar day name (初二 ... 卅)
              let lunarTag = cell.lunar?.lunarDayName || '初一';
              let isRedLunar = false;

              if (cell.lunar?.taiwanHoliday) {
                lunarTag = cell.lunar.taiwanHoliday;
                isRedLunar = true;
              } else if (cell.lunar?.solarTerm) {
                lunarTag = cell.lunar.solarTerm;
                isRedLunar = true;
              } else if (cell.lunar?.lunarDayNum === 1 || cell.lunar?.lunarDayName === '初一') {
                lunarTag = cell.lunar.lunarMonthName || '正月';
              }

              return (
                <button
                  key={`${cell.ymd}-${idx}`}
                  type="button"
                  onClick={() => setPickedDate(cell.date)}
                  className={`relative flex flex-col items-center justify-between p-1 rounded-xl transition cursor-pointer aspect-square ${
                    !cell.isCurrentMonth ? 'opacity-30' : 'opacity-100'
                  } ${
                    isSelected
                      ? 'bg-[#2D2D2D] text-white shadow-md scale-105 z-10'
                      : cell.isToday
                      ? 'bg-[#D4B483]/30 border border-[#D4B483] text-[#2D2D2D]'
                      : 'hover:bg-[#EAE3D5]/60 text-[#2D2D2D]'
                  }`}
                >
                  {/* Solar Date Number */}
                  <span
                    className={`font-serif font-black text-sm sm:text-base leading-none pt-0.5 ${
                      isSelected
                        ? 'text-white'
                        : isSunday
                        ? 'text-[#C83E31]'
                        : 'text-[#2D2D2D]'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Real Taiwanese Lunar Text / Holiday / Solar Term */}
                  <span
                    className={`text-[9px] font-sans truncate max-w-full scale-90 ${
                      isSelected
                        ? 'text-[#D4B483]'
                        : isRedLunar
                        ? 'text-[#C83E31] font-bold'
                        : 'text-[#6E6A63]'
                    }`}
                  >
                    {lunarTag}
                  </span>

                  {/* Stamp or Dot Indicators */}
                  <div className="flex items-center gap-0.5 h-2">
                    {hasSurvived && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#C83E31] ring-1 ring-white"
                        title="此日已平安生還"
                      />
                    )}
                    {cell.isToday && !hasSurvived && (
                      <span className="w-1 h-1 rounded-full bg-[#D4B483]" />
                    )}
                    {cell.isCurrentMonth && (
                      (() => {
                        const cellDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(cell.dayNum).padStart(2, '0')}`;
                        const hasCustom = customEvents?.some((e) => e.dateKey === cellDateStr);
                        if (hasCustom) {
                          return (
                            <span
                              className="w-1 h-1 rounded-full bg-[#2D2D2D]/80 ring-0.5 ring-stone-400"
                              title="此日有自訂行程"
                            />
                          );
                        }
                        return null;
                      })()
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Date Preview Box */}
          <div className="rounded-2xl border-2 border-[#2D2D2D] p-3.5 bg-white/80 shadow-sm space-y-2.5">
            {/* Header info + Add Event Button */}
            <div className="flex items-center justify-between border-b border-[#2D2D2D]/15 pb-2 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif font-black text-2xl text-[#2D2D2D]">
                  {pickedDate.getMonth() + 1}月 {pickedDate.getDate()}日
                </span>
                <span className="text-xs font-sans text-[#6E6A63] font-bold">
                  {pickedWeekdayZh} | {pickedLunar?.fullDisplayText || '農曆九月廿二'}
                </span>
                {isPickedToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C83E31] text-white">
                    今天
                  </span>
                )}
              </div>

              {onOpenAddEvent && (
                <button
                  type="button"
                  onClick={() => onOpenAddEvent(pickedDateStr)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2D2D2D] hover:bg-[#C83E31] text-[#F9F6F0] text-[11px] font-sans font-bold shadow-xs transition active:scale-95 cursor-pointer ml-auto"
                  title="為此日新增行程"
                >
                  <Plus className="w-3 h-3 text-[#D4B483]" />
                  <span>新增行程</span>
                </button>
              )}
            </div>

            {/* If Future Date: Vintage Talisman Seal Card! */}
            {isPickedFuture ? (
              <div className="space-y-2.5">
                <div className="rounded-xl border-2 border-[#C83E31] bg-[#FFF8E7] p-3 text-center space-y-1.5 shadow-inner">
                  <div className="font-serif font-black text-sm text-[#C83E31] flex items-center justify-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>🔮 未來幹話封印中（當日 00:00 解鎖）</span>
                  </div>
                  <p className="text-[11px] font-sans text-[#2D2D2D]/70 italic">
                    「命運不可預支，未來的爛事請留到明天再承受。」
                  </p>
                </div>

                {/* Future Date 宜 / 忌 Preview */}
                <div className="text-xs font-sans bg-[#F3EFE6] rounded-xl p-2.5 text-[#2D2D2D] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#C83E31]">宜：</span>
                    <span>{pickedQuote?.yi || '帶薪拉屎・安靜耍廢'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#6E6A63]">忌：</span>
                    <span>{pickedQuote?.ji || '主動問老闆還有沒有事'}</span>
                  </div>
                </div>

                {/* Future Schedule Preview (Planner Mode) */}
                {pickedDayEvents.length > 0 && (
                  <div className="rounded-xl bg-[#F3EFE6] p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-sans font-bold text-[#2D2D2D]">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-[#6E6A63]" />
                        <span>預排行程</span>
                      </span>
                      <span className="text-[10px] text-[#6E6A63]">
                        {pickedDayEvents.length} 場行程
                      </span>
                    </div>
                    {pickedDayEvents.map((m) => {
                      const isCustom = m.source === 'local';
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (isCustom && onEditEvent) {
                              onEditEvent(m);
                            }
                          }}
                          className={`text-xs font-sans text-[#2D2D2D] flex items-center justify-between py-1 px-1.5 rounded-md transition ${
                            isCustom ? 'hover:bg-[#EAE3D5] cursor-pointer' : ''
                          }`}
                          title={isCustom ? '點擊編輯此行程' : undefined}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isCustom ? 'bg-[#D4B483]' : 'bg-[#6E6A63]'
                              }`}
                            />
                            <span className="text-[11px] text-[#6E6A63] shrink-0 font-mono font-bold">
                              {formatEventTime(m)}
                            </span>
                            {m.calendarName && (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-sans font-medium shrink-0 max-w-[80px] truncate border"
                                style={{
                                  backgroundColor: m.calendarColor ? `${m.calendarColor}18` : '#2D2D2D10',
                                  borderColor: m.calendarColor ? `${m.calendarColor}50` : '#2D2D2D25',
                                  color: m.calendarColor || '#2D2D2D',
                                }}
                                title={m.calendarName}
                              >
                                {m.calendarName}
                              </span>
                            )}
                            <span className="truncate font-medium text-[#2D2D2D]">{m?.title || '未命名行程'}</span>
                            {isCustom && (
                              <span className="text-[9px] px-1 rounded bg-[#D4B483]/20 text-[#785A3C] font-bold shrink-0 flex items-center gap-0.5">
                                <Edit2 className="w-2.5 h-2.5" /> 自訂
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Past or Today Preview: Mini Character Thumbnail + Main Quote + Subtext + 宜/忌 + Synced Events */
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F0] border border-[#2D2D2D]/20">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-[#2D2D2D]/15 bg-[#F3EFE6] flex items-center justify-center">
                    <CharacterIllustration
                      character={(pickedQuote?.character as CharacterType) || 'cat'}
                      sceneId={pickedQuote?.sceneId}
                      assetPath={pickedQuote?.assetPath}
                      spriteSheet={pickedQuote?.spriteSheet}
                      spritePosition={pickedQuote?.spritePosition}
                      compact
                      className="w-14 h-14"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-serif font-black text-xs sm:text-sm text-[#2D2D2D] leading-snug line-clamp-2">
                      {pickedQuote?.quote || '今天行事曆一片淨土，適合安靜當個薪水小偷。'}
                    </p>
                    <p className="text-[11px] font-sans text-[#6E6A63] truncate">
                      {pickedQuote?.subtext || '沒有會議就是最好的會議'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-[#6E6A63]">
                    生還狀態：
                    <span className={`font-bold ml-1 ${isPickedSurvived ? 'text-[#C83E31]' : 'text-[#6E6A63]'}`}>
                      {isPickedSurvived ? '💮 今日已平安生還' : '尚未蓋章存檔'}
                    </span>
                  </span>
                  <span className="text-[11px] text-[#6E6A63]">
                    摸魚吉時：{pickedLunar?.luckySlackTime ? pickedLunar.luckySlackTime.split(' ')[0] : '14:00 - 15:30'}
                  </span>
                </div>

                <div className="text-xs font-sans bg-[#F3EFE6] rounded-xl p-2.5 text-[#2D2D2D] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#C83E31]">宜：</span>
                    <span>{pickedQuote?.yi || '帶薪拉屎・準時閃人'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#6E6A63]">忌：</span>
                    <span>{pickedQuote?.ji || '主動問老闆還有沒有事'}</span>
                  </div>
                </div>

                {/* Day meetings */}
                {pickedDayEvents.length > 0 && (
                  <div className="rounded-xl bg-[#F3EFE6] p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-sans font-bold text-[#2D2D2D]">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-[#6E6A63]" />
                        <span>當日排定行程</span>
                      </span>
                      <span className="text-[10px] text-[#6E6A63]">
                        {pickedDayEvents.length} 場行程
                      </span>
                    </div>
                    {pickedDayEvents.map((m) => {
                      const isCustom = m.source === 'local';
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (isCustom && onEditEvent) {
                              onEditEvent(m);
                            }
                          }}
                          className={`text-xs font-sans text-[#2D2D2D] flex items-center justify-between py-1 px-1.5 rounded-md transition ${
                            isCustom ? 'hover:bg-[#EAE3D5] cursor-pointer' : ''
                          }`}
                          title={isCustom ? '點擊編輯此行程' : undefined}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isCustom ? 'bg-[#D4B483]' : 'bg-[#C83E31]'
                              }`}
                            />
                            <span className="text-[11px] text-[#6E6A63] shrink-0 font-mono font-bold">
                              {formatEventTime(m)}
                            </span>
                            {m.calendarName && (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-sans font-medium shrink-0 max-w-[80px] truncate border"
                                style={{
                                  backgroundColor: m.calendarColor ? `${m.calendarColor}18` : '#2D2D2D10',
                                  borderColor: m.calendarColor ? `${m.calendarColor}50` : '#2D2D2D25',
                                  color: m.calendarColor || '#2D2D2D',
                                }}
                                title={m.calendarName}
                              >
                                {m.calendarName}
                              </span>
                            )}
                            <span className="truncate font-medium text-[#2D2D2D]">{m?.title || '未命名行程'}</span>
                            {isCustom && (
                              <span className="text-[9px] px-1 rounded bg-[#D4B483]/20 text-[#785A3C] font-bold shrink-0 flex items-center gap-0.5">
                                <Edit2 className="w-2.5 h-2.5" /> 自訂
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Select / Jump Button */}
            <button
              type="button"
              onClick={handleConfirmSelect}
              className="w-full py-2.5 rounded-xl border-2 border-[#2D2D2D] bg-[#2D2D2D] hover:bg-[#1c1c1c] text-[#F9F6F0] font-sans font-extrabold text-xs transition active:scale-95 cursor-pointer shadow-[0_3px_0_#6E6A63] flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#D4B483]" />
              <span>
                {isPickedFuture
                  ? `檢視 ${pickedDate.getMonth() + 1}/${pickedDate.getDate()} 行程與封印卡`
                  : isPickedToday
                  ? '前往今日日曆'
                  : `翻閱至 ${pickedDate.getMonth() + 1}/${pickedDate.getDate()} 存檔`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
