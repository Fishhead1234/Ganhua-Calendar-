import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Calendar,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  Plus,
  Edit2,
  Copy,
  Check,
  Clock,
  MapPin,
  FileText,
  Tag,
  Bell,
} from 'lucide-react';
import { getLunarDetails, LunarInfo } from '../utils/lunarUtils';
import { toLocalDateKey } from '../utils/dateUtils';
import {
  CalendarMeeting,
  CustomCalendarEvent,
  getMergedEvents,
  resolveDayContent,
  ResolvedDayContent,
} from '../services/calendarService';
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
  allEvents?: CalendarMeeting[]; // Full 90-day synced + custom events list
  customEvents?: CustomCalendarEvent[];
  quotes?: RawStaticQuote365[];
  onSelectDate: (targetDate: Date) => void;
  onOpenAddEvent?: (dateStr: string) => void;
  onEditEvent?: (event: CalendarMeeting) => void;
  onShowToast?: (msg: string) => void;
  isTodayUnlocked?: boolean;
}

export const MonthlyCalendarModal: React.FC<MonthlyCalendarModalProps> = ({
  isOpen,
  onClose,
  currentDate = new Date(),
  today = new Date(),
  survivedDates = [],
  activeMeetings = [],
  allEvents = [],
  customEvents = [],
  quotes,
  onSelectDate,
  onOpenAddEvent,
  onEditEvent,
  onShowToast,
  isTodayUnlocked = true,
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
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const handleCopyWish = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // ignore
    }
    setCopyToast('已複製！快去貼上交差');
    setTimeout(() => setCopyToast(null), 2500);
  };

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
    return toLocalDateKey(pickedDate);
  }, [pickedDate]);

  // Master events covering the full 90-day window (synced BSKL, SchoolsBuddy, Family + custom events)
  const masterEvents = useMemo(() => {
    return allEvents && allEvents.length > 0 ? allEvents : activeMeetings;
  }, [allEvents, activeMeetings]);

  // Filter bookings immediately on first tap without leaving modal!
  const pickedDayEvents = useMemo<CalendarMeeting[]>(() => {
    return getMergedEvents(masterEvents, pickedDateStr);
  }, [masterEvents, customEvents, pickedDateStr]);

  // Unified Gàn-huà quote and illustration for selected date matching Daily Card & Widgets 100%!
  const [modalCardViewModeMap, setModalCardViewModeMap] = useState<Record<string, 'roast' | 'original'>>({});
  const pickedCardMode = modalCardViewModeMap[pickedDateStr];

  const pickedMonth = pickedDate.getMonth() + 1;
  const pickedDay = pickedDate.getDate();
  const pickedQuote = useMemo<ResolvedDayContent>(() => {
    return resolveDayContent(pickedDate, pickedDayEvents, {
      quotes,
      userCardMode: pickedCardMode,
    });
  }, [quotes, pickedDate, pickedDayEvents, pickedCardMode]);

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

  // Expandable events detail state
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const toggleExpandEvent = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const toggleExpandAllEvents = (events: CalendarMeeting[]) => {
    if (expandedEventIds.size === events.length) {
      setExpandedEventIds(new Set());
    } else {
      setExpandedEventIds(new Set(events.map((e) => e.id)));
    }
  };

  const handleCopyEventDetails = (m: CalendarMeeting, e: React.MouseEvent) => {
    e.stopPropagation();
    const timeStr = m.isAllDay
      ? '全天活動 (All Day)'
      : `${String(m.startHour ?? 9).padStart(2, '0')}:${String(m.startMinute ?? 0).padStart(2, '0')} (${m.durationMinutes ?? 60} 分鐘)`;
    const parts = [
      `📅 行程：${m.title || '未命名行程'}`,
      `⏰ 時間：${timeStr}`,
    ];
    if (m.calendarName) {
      parts.push(`🏷️ 日曆：${m.calendarName} (${m.source === 'local' ? '本地自訂' : '手機系統同步'})`);
    }
    if (m.location) {
      parts.push(`📍 地點：${m.location}`);
    }
    if (m.notes) {
      parts.push(`📝 備註：${m.notes}`);
    }
    const text = parts.join('\n');
    try {
      navigator.clipboard.writeText(text);
      setCopiedEventId(m.id);
      if (onShowToast) {
        onShowToast('📋 行程明細已複製到剪貼簿！');
      }
      setTimeout(() => setCopiedEventId(null), 2000);
    } catch {
      // ignore
    }
  };

  const renderEventsList = (events: CalendarMeeting[], isFuture: boolean) => {
    if (events.length === 0) return null;
    const allExpanded = events.length > 0 && expandedEventIds.size === events.length;

    return (
      <div className="rounded-xl bg-[#F3EFE6] p-2.5 space-y-1.5 border border-[#2D2D2D]/10">
        <div className="flex items-center justify-between text-xs font-sans font-bold text-[#2D2D2D]">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#6E6A63]" />
            <span>{isFuture ? '預排行程' : '當日排定行程'}</span>
            <span className="text-[10px] text-[#6E6A63] font-normal font-mono">
              ({events.length} 場)
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleExpandAllEvents(events)}
              className="px-2 py-0.5 rounded-full bg-white border border-[#2D2D2D]/20 hover:border-[#2D2D2D] text-[#6E6A63] hover:text-[#2D2D2D] text-[10px] font-sans font-bold transition cursor-pointer active:scale-95"
            >
              <span>{allExpanded ? '全部收合' : '展開明細'}</span>
            </button>
            {onOpenAddEvent && (
              <button
                type="button"
                onClick={() => onOpenAddEvent(pickedDateStr)}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#2D2D2D] text-[#F9F6F0] text-[10px] font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer active:scale-95"
                title="新增行程"
              >
                <Plus className="w-2.5 h-2.5 text-[#D4B483]" />
                <span>新增</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {events.map((m) => {
            const isCustom = m.source === 'local';
            const isExpanded = expandedEventIds.has(m.id);
            const isCopied = copiedEventId === m.id;

            return (
              <div
                key={m.id}
                className={`rounded-lg border transition-all overflow-hidden ${
                  isExpanded
                    ? 'bg-white border-[#2D2D2D] shadow-xs'
                    : 'bg-white/70 border-[#2D2D2D]/10 hover:border-[#2D2D2D]/30 hover:bg-white'
                }`}
              >
                {/* Header row: clickable to toggle */}
                <div
                  onClick={() => toggleExpandEvent(m.id)}
                  className="flex items-center justify-between py-1.5 px-2 cursor-pointer transition select-none text-xs font-sans text-[#2D2D2D]"
                  title={isExpanded ? '點擊收合詳細資訊' : '點擊展開查看完整資訊與備忘'}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1.5">
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
                    <span className={`font-medium text-[#2D2D2D] ${isExpanded ? 'break-words' : 'truncate'}`}>
                      {m?.title || '未命名行程'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {m.reminders && m.reminders.length > 0 && (
                      <span
                        className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold shrink-0"
                        title={`已設定 ${m.reminders.length} 組提醒`}
                      >
                        🔔 x{m.reminders.length}
                      </span>
                    )}
                    {isCustom && !isExpanded && (
                      <span className="text-[9px] px-1 rounded bg-[#D4B483]/20 text-[#785A3C] font-bold shrink-0">
                        自訂
                      </span>
                    )}
                    <div
                      className={`p-0.5 text-[#6E6A63] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-[#C83E31]' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Expanded Details Pane */}
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 pt-1 border-t border-[#2D2D2D]/10 bg-[#FAF7F0]/70 space-y-2 text-xs font-sans animate-in fade-in duration-150 select-text">
                    {/* Full Untruncated Title */}
                    <div className="space-y-0.5 pt-0.5">
                      <div className="text-[9px] font-sans font-bold text-[#8C877D] flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-[#C83E31]" />
                        <span>完整行程標題</span>
                      </div>
                      <p className="font-serif font-black text-xs text-[#2D2D2D] leading-snug break-words">
                        {m.title || '未命名行程'}
                      </p>
                    </div>

                    {/* Time & Duration */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#2D2D2D]">
                      <Clock className="w-3 h-3 text-[#6E6A63] shrink-0" />
                      <span className="font-mono font-bold">
                        {m.isAllDay
                          ? '全天活動 (All Day)'
                          : `${String(m.startHour ?? 9).padStart(2, '0')}:${String(m.startMinute ?? 0).padStart(2, '0')} (約 ${m.durationMinutes ?? 60} 分鐘)`}
                      </span>
                    </div>

                    {/* Calendar origin */}
                    <div className="flex items-center gap-1.5 text-[10px] text-[#6E6A63] flex-wrap">
                      <Calendar className="w-3 h-3 text-[#6E6A63] shrink-0" />
                      <span className="font-medium">所屬：</span>
                      <span
                        className="px-1.5 py-0.2 rounded font-bold border text-[9px]"
                        style={{
                          backgroundColor: m.calendarColor ? `${m.calendarColor}18` : '#2D2D2D10',
                          borderColor: m.calendarColor ? `${m.calendarColor}50` : '#2D2D2D25',
                          color: m.calendarColor || '#2D2D2D',
                        }}
                      >
                        {m.calendarName || (isCustom ? '本地自訂行程' : '手機系統行事曆')}
                      </span>
                      <span className="text-[#8C877D]">
                        ({isCustom ? '本地自訂' : '手機系統同步'})
                      </span>
                    </div>

                    {/* Location (if present) */}
                    {m.location && (
                      <div className="flex items-start gap-1.5 text-[11px] text-[#2D2D2D] bg-white p-1.5 rounded-lg border border-[#2D2D2D]/10">
                        <MapPin className="w-3 h-3 text-[#C83E31] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[#6E6A63] text-[9px] block">活動地點</span>
                          <span className="font-medium text-[#2D2D2D] break-words">
                            {m.location}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Notes (if present) */}
                    {m.notes && (
                      <div className="space-y-0.5">
                        <div className="text-[9px] font-sans font-bold text-[#8C877D] flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5 text-[#6E6A63]" />
                          <span>詳細備忘 / 內文</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-[#2D2D2D]/10 font-sans text-[11px] text-[#2D2D2D] leading-relaxed whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                          {m.notes}
                        </div>
                      </div>
                    )}

                    {/* Reminders List (if present) */}
                    {m.reminders && m.reminders.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                        <Bell className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>已設定提醒：</span>
                        <div className="flex gap-1 flex-wrap">
                          {m.reminders.map((r, idx) => (
                            <span key={r.id || idx} className="font-mono font-bold">
                              {r.value}{' '}
                              {r.unit === 'hours' ? '小時' : r.unit === 'days' ? '天' : '分鐘'}前
                              {idx < (m.reminders?.length || 1) - 1 ? '、' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#2D2D2D]/10">
                      <button
                        type="button"
                        onClick={(e) => handleCopyEventDetails(m, e)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#2D2D2D]/20 hover:border-[#2D2D2D] text-[#2D2D2D] text-[10px] font-sans font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                        title="複製完整行程內容"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">已複製！</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#6E6A63]" />
                            <span>複製行程</span>
                          </>
                        )}
                      </button>

                      {isCustom && onEditEvent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditEvent(m);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D4B483]/30 hover:bg-[#D4B483]/50 border border-[#D4B483] text-[#5A4228] text-[10px] font-sans font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                          title="編輯此自訂行程"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>編輯行程</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
        const ymd = toLocalDateKey(d);
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
        const ymd = toLocalDateKey(dateObj);
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
        const ymd = toLocalDateKey(d);
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
  const pickedYmd = toLocalDateKey(pickedDate);
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

                    {/* Booking Dots & Stamp Indicators */}
                    <div className="flex items-center gap-0.5 h-2">
                      {hasSurvived && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#C83E31] ring-1 ring-white shrink-0"
                          title="此日已平安生還"
                        />
                      )}
                      {cell.isToday && !hasSurvived && (
                        <span className="w-1 h-1 rounded-full bg-[#D4B483] shrink-0" />
                      )}
                      {cell.isCurrentMonth && (() => {
                        const cellDateStr = cell.ymd;
                        const dayEvents = masterEvents.filter((m) => m.dateKey === cellDateStr);
                        if (dayEvents.length > 0) {
                          return (
                            <div className="flex items-center gap-0.5 justify-center max-w-full overflow-hidden">
                              {dayEvents.slice(0, 3).map((ev, i) => (
                                <span
                                  key={ev.id || i}
                                  className="w-1.5 h-1.5 rounded-full shadow-xs border border-black/15 shrink-0"
                                  style={{ backgroundColor: ev.calendarColor || '#2D2D2D' }}
                                  title={`${ev.calendarName ? `[${ev.calendarName}] ` : ''}${ev.title}`}
                                />
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="w-1 h-1 rounded-full bg-stone-400 shrink-0" />
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
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
                {renderEventsList(pickedDayEvents, true)}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {pickedQuote?.hasRoastOverride && pickedQuote?.roastBadge && (
                        <span className="inline-block text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-[#C83E31]/10 text-[#C83E31] border border-[#C83E31]/20 truncate max-w-full">
                          {pickedQuote.roastBadge}
                        </span>
                      )}
                      {pickedQuote?.canToggleRoast && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentMode =
                              pickedQuote.currentMode ||
                              (pickedQuote.hasRoastOverride ? 'roast' : 'original');
                            const nextMode = currentMode === 'roast' ? 'original' : 'roast';
                            setModalCardViewModeMap((prev) => ({ ...prev, [pickedDateStr]: nextMode }));
                          }}
                          className="inline-flex items-center gap-0.5 text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-white hover:bg-[#F3EFE6] text-[#6E6A63] border border-[#2D2D2D]/20 cursor-pointer active:scale-95 transition"
                          title="切換原創幹話與行程吐槽"
                        >
                          <span>{pickedQuote.hasRoastOverride ? '🔀 換回每日原創' : '🎒 查看行程吐槽'}</span>
                        </button>
                      )}
                    </div>
                    <p className="font-serif font-black text-xs sm:text-sm text-[#2D2D2D] leading-snug line-clamp-2">
                      {pickedQuote?.quote || '今天行事曆一片淨土，適合安靜當個薪水小偷。'}
                    </p>
                    <p className="text-[11px] font-sans text-[#6E6A63] truncate">
                      {pickedQuote?.subtext || '沒有會議就是最好的會議'}
                    </p>
                  </div>
                </div>

                {/* 1-Tap Birthday Wish Copy Bar (for other person's birthday) */}
                {pickedQuote?.eventType === 'other_person_birthday' && (
                  <div className="rounded-xl bg-[#FFF8EB] border border-[#D4B483] p-2.5 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between font-serif font-black text-[#785A3C] text-[11px]">
                      <div className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5 text-[#C83E31]" />
                        <span>💬 懶得想祝賀詞？一鍵複製傳給壽星：</span>
                      </div>
                      {copyToast && (
                        <span className="text-[10px] font-sans font-bold text-[#C83E31] animate-in fade-in">
                          ✓ {copyToast}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyWish('生日快樂！！🎉🎂 祝天天開心、事事順心！');
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#D4B483] hover:bg-[#F9F6F0] text-[#2D2D2D] font-sans font-bold text-[10px] shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <span>🤖 群組省力版</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyWish('生日快樂🎂！祝你今年會議少一點、薪水多一點、老闆離你遠一點！');
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#D4B483] hover:bg-[#F9F6F0] text-[#2D2D2D] font-sans font-bold text-[10px] shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <span>💼 社畜同事版</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyWish('祝你生日快樂🎉！雖然又老了一歲，但別難過，因為你明年會更老！');
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#D4B483] hover:bg-[#F9F6F0] text-[#2D2D2D] font-sans font-bold text-[10px] shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <span>🔥 損友幹話版</span>
                      </button>
                    </div>
                  </div>
                )}

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
                {renderEventsList(pickedDayEvents, false)}
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
                  ? !isTodayUnlocked
                    ? '✂️ 親手撕下昨日・解鎖今日'
                    : '前往今日日曆'
                  : `翻閱至 ${pickedDate.getMonth() + 1}/${pickedDate.getDate()} 存檔`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
