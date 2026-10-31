import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Calendar,
  Sparkles,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { getLunarDetails, LunarInfo } from '../utils/lunarUtils';
import { CalendarMeeting } from '../services/calendarService';
import { generateMeetingRoastTag } from './DailyAgendaStrip';

interface MonthlyCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  today?: Date;
  survivedDates: string[];
  activeMeetings?: CalendarMeeting[];
  onSelectDate: (targetDate: Date) => void;
}

export const MonthlyCalendarModal: React.FC<MonthlyCalendarModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  today = new Date(),
  survivedDates,
  activeMeetings = [],
  onSelectDate,
}) => {
  const [viewYear, setViewYear] = useState<number>(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentDate.getMonth()); // 0-11
  const [pickedDate, setPickedDate] = useState<Date>(currentDate);

  if (!isOpen) return null;

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const pickedMidnight = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());
  const isPickedFuture = pickedMidnight.getTime() > todayMidnight.getTime();
  const isPickedToday = pickedMidnight.getTime() === todayMidnight.getTime();

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

  // Generate 7-column calendar matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Calendar cells
  const calendarCells: {
    date: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    ymd: string;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
    lunar: LunarInfo;
  }[] = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    calendarCells.push({
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
    calendarCells.push({
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
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(viewYear, viewMonth + 1, i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    calendarCells.push({
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

  const pickedLunar = getLunarDetails(pickedDate);
  const pickedWeekdayZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][pickedDate.getDay()];
  const pickedYmd = `${pickedDate.getFullYear()}-${String(pickedDate.getMonth() + 1).padStart(2, '0')}-${String(pickedDate.getDate()).padStart(2, '0')}`;
  const isPickedSurvived = survivedDates.includes(pickedYmd);

  const handleConfirmSelect = () => {
    onSelectDate(pickedDate);
    onClose();
  };

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

              const hasSurvived = survivedDates.includes(cell.ymd);
              const isSunday = cell.date.getDay() === 0;

              // Solar term or Taiwan Holiday in red
              const lunarTag = cell.lunar.taiwanHoliday || cell.lunar.solarTerm || cell.lunar.lunarDayName;
              const isRedLunar = Boolean(cell.lunar.taiwanHoliday || cell.lunar.solarTerm);

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
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Date Preview Box */}
          <div className="rounded-2xl border-2 border-[#2D2D2D] p-3.5 bg-white/80 shadow-sm space-y-2.5">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-[#2D2D2D]/15 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-2xl text-[#2D2D2D]">
                  {pickedDate.getMonth() + 1}月 {pickedDate.getDate()}日
                </span>
                <span className="text-xs font-sans text-[#6E6A63] font-bold">
                  {pickedWeekdayZh} | {pickedLunar.fullDisplayText}
                </span>
              </div>
              {isPickedToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C83E31] text-white">
                  今天
                </span>
              )}
            </div>

            {/* If Future Date: Vintage Talisman Seal Card! */}
            {isPickedFuture ? (
              <div className="space-y-3">
                <div className="rounded-xl border-2 border-[#C83E31] bg-[#FFF8E7] p-3 text-center space-y-2 shadow-inner">
                  {/* Talisman Calligraphy Graphic */}
                  <div className="w-16 h-20 mx-auto rounded-lg border-2 border-[#C83E31] bg-[#FCE8B2] flex flex-col items-center justify-between py-1.5 text-[#C83E31] shadow-sm select-none">
                    <span className="text-[10px] font-serif font-black tracking-widest">
                      敕令
                    </span>
                    <span className="text-sm font-serif font-black writing-vertical tracking-widest">
                      幹話
                    </span>
                    <span className="text-[9px] font-sans font-bold">封印中</span>
                  </div>

                  <div className="font-serif font-black text-base text-[#C83E31]">
                    🔮 未來幹話封印中
                  </div>
                  <p className="text-xs font-sans text-[#6E6A63]">
                    （將於當日 00:00 自動解鎖）
                  </p>
                  <p className="text-[11px] font-sans text-[#2D2D2D]/70 italic">
                    「命運不可預支，未來的爛事請留到明天再承受。」
                  </p>
                </div>

                {/* Future Schedule Preview (Planner Mode) */}
                <div className="rounded-xl bg-[#F3EFE6] p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-sans font-bold text-[#2D2D2D]">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-[#6E6A63]" />
                      <span>預排行程 (Planner)</span>
                    </span>
                    <span className="text-[10px] text-[#6E6A63]">
                      {isPickedToday ? activeMeetings.length : 1} 場行程
                    </span>
                  </div>
                  <div className="text-xs font-sans text-[#6E6A63] flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6E6A63]" />
                      <span>09:30 週一早會</span>
                    </span>
                    <Lock className="w-3 h-3 text-[#6E6A63]" />
                  </div>
                </div>
              </div>
            ) : (
              /* Past or Today Preview */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-[#6E6A63]">
                    生還狀態：
                    <span className={`font-bold ml-1 ${isPickedSurvived ? 'text-[#C83E31]' : 'text-[#6E6A63]'}`}>
                      {isPickedSurvived ? '💮 今日已平安生還' : '尚未蓋章存檔'}
                    </span>
                  </span>
                  <span className="text-[11px] text-[#6E6A63]">
                    摸魚吉時：{pickedLunar.luckySlackTime.split(' ')[0]}
                  </span>
                </div>

                <div className="text-xs font-sans bg-[#F3EFE6] rounded-xl p-2.5 text-[#2D2D2D] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#C83E31]">宜：</span>
                    <span>帶薪拉屎、準時閃人</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#6E6A63]">忌：</span>
                    <span>主動問老闆還有沒有事</span>
                  </div>
                </div>
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

