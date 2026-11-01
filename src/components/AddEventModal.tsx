import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Trash2,
  Check,
  FileText,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { CustomCalendarEvent } from '../services/calendarService';
import specialEventsData from '../data/special_events_quotes.json';
import { SpecialEventQuote } from '../utils/eventRoastMatcher';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  editingEvent?: CustomCalendarEvent | null;
  onSave: (event: CustomCalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

interface QuickChip {
  label: string;
  keyword: string;
  icon: string;
}

const QUICK_SCENARIO_CHIPS: QuickChip[] = [
  { label: '💼 週會', keyword: '週會', icon: '💼' },
  { label: '📊 1-on-1', keyword: '1-on-1', icon: '📊' },
  { label: '🚨 趕死線', keyword: '趕死線', icon: '🚨' },
  { label: '🍲 家庭聚餐', keyword: '家庭聚餐', icon: '🍲' },
  { label: '💣 喝喜酒', keyword: '喝喜酒', icon: '💣' },
  { label: '🍻 尾牙應酬', keyword: '尾牙應酬', icon: '🍻' },
  { label: '🏥 看牙醫', keyword: '看牙醫', icon: '🏥' },
  { label: '💘 約會', keyword: '約會', icon: '💘' },
  { label: '🏖️ 請特休', keyword: '請特休', icon: '🏖️' },
];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  editingEvent,
  onSave,
  onDelete,
}) => {
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getUpcomingDefaultTimes = () => {
    const now = new Date();
    const nextHour = (now.getHours() + 1) % 24;
    const afterNextHour = (nextHour + 1) % 24;
    return {
      start: `${String(nextHour).padStart(2, '0')}:00`,
      end: `${String(afterNextHour).padStart(2, '0')}:00`,
    };
  };

  const [title, setTitle] = useState('');
  const [dateKey, setDateKey] = useState(initialDate || getTodayStr());
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState(() => getUpcomingDefaultTimes().start);
  const [endTime, setEndTime] = useState(() => getUpcomingDefaultTimes().end);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when opening modal or changing editing event
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (editingEvent) {
        setTitle(editingEvent.title);
        setDateKey(editingEvent.dateKey);
        setIsAllDay(editingEvent.isAllDay);
        const sH = String(editingEvent.startHour).padStart(2, '0');
        const sM = String(editingEvent.startMinute).padStart(2, '0');
        setStartTime(`${sH}:${sM}`);

        const totalMinutes = editingEvent.startHour * 60 + editingEvent.startMinute + editingEvent.durationMinutes;
        const eH = String(Math.floor((totalMinutes / 60) % 24)).padStart(2, '0');
        const eM = String(totalMinutes % 60).padStart(2, '0');
        setEndTime(`${eH}:${eM}`);
        setNotes(editingEvent.notes || '');
      } else {
        const defaults = getUpcomingDefaultTimes();
        setTitle('');
        setDateKey(initialDate || getTodayStr());
        setIsAllDay(false);
        setStartTime(defaults.start);
        setEndTime(defaults.end);
        setNotes('');
      }
    }
  }, [isOpen, editingEvent, initialDate]);

  // Live match against special events quotes based on title keyword
  const matchedRoast = useMemo<SpecialEventQuote | null>(() => {
    if (!title.trim()) return null;
    const lower = title.toLowerCase();
    const list = specialEventsData as SpecialEventQuote[];

    for (const item of list) {
      if (item.triggerKeywords?.some((kw) => lower.includes(kw.toLowerCase()))) {
        return item;
      }
    }
    return null;
  }, [title]);

  if (!isOpen) return null;

  const handleChipClick = (chip: QuickChip) => {
    if (!title.trim()) {
      setTitle(chip.keyword);
    } else if (!title.includes(chip.keyword)) {
      setTitle(`${title} ${chip.keyword}`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入行程名稱');
      return;
    }

    const [sHourStr, sMinStr] = startTime.split(':');
    const [eHourStr, eMinStr] = endTime.split(':');
    const startHour = Number(sHourStr) || 9;
    const startMinute = Number(sMinStr) || 0;
    const endHour = Number(eHourStr) || (startHour + 1);
    const endMinute = Number(eMinStr) || 0;

    let durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (durationMinutes <= 0) {
      durationMinutes = 60; // minimum fallback
    }

    const newEvent: CustomCalendarEvent = {
      id: editingEvent ? editingEvent.id : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      dateKey,
      startHour: isAllDay ? 9 : startHour,
      startMinute: isAllDay ? 0 : startMinute,
      durationMinutes: isAllDay ? 480 : durationMinutes,
      isAllDay,
      notes: notes.trim() || undefined,
      source: 'local',
      createdAt: editingEvent?.createdAt || Date.now(),
    };

    onSave(newEvent);
    onClose();
  };

  const handleDelete = () => {
    if (editingEvent && onDelete) {
      if (window.confirm(`確定要刪除「${editingEvent.title}」此行程嗎？`)) {
        onDelete(editingEvent.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#FAF7F0] rounded-[26px] border-2 border-[#2D2D2D] shadow-[0_20px_40px_rgba(45,45,45,0.2),0_6px_0_#2D2D2D] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-[#2D2D2D] text-[#F9F6F0] px-5 py-3 flex items-center justify-between border-b-2 border-[#2D2D2D] select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#D4B483] border border-[#F9F6F0]/40 shadow-inner" />
            <span className="font-serif font-black text-sm tracking-widest text-[#F9F6F0]">
              {editingEvent ? '編輯社畜行程' : '新增社畜行程'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#FAF7F0]/10 hover:bg-[#FAF7F0]/20 text-[#FAF7F0] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-[#C83E31]/10 border border-[#C83E31]/30 text-[#C83E31] text-xs font-sans font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Date Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C83E31]" />
              <span>行程日期</span>
            </label>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-sm font-sans font-bold text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483] shadow-xs"
            />
          </div>

          {/* 2. All-day toggle & Time Pickers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C83E31]" />
                <span>行程時間</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-[#2D2D2D] text-[#C83E31] focus:ring-0 cursor-pointer accent-[#C83E31]"
                />
                <span className="text-xs font-sans font-bold text-[#6E6A63]">全天行程</span>
              </label>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="block text-[11px] font-sans text-[#6E6A63] mb-1">開始時間</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-sm font-mono font-bold text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483]"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-sans text-[#6E6A63] mb-1">結束時間</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-sm font-mono font-bold text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Quick Scenario Chips (社畜快速標籤) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#C83E31]" />
                <span>社畜快速標籤（點擊帶入）</span>
              </span>
              <span className="text-[10px] font-sans text-[#6E6A63]">觸發專屬吐槽</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_SCENARIO_CHIPS.map((chip) => (
                <button
                  key={chip.keyword}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className={`px-2.5 py-1 rounded-full text-xs font-sans font-bold transition cursor-pointer border active:scale-95 ${
                    title.includes(chip.keyword)
                      ? 'bg-[#C83E31] text-white border-[#C83E31] shadow-xs'
                      : 'bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#2D2D2D] border-[#2D2D2D]/30'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Event Title Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-serif font-black text-[#2D2D2D]">
              行程名稱 <span className="text-[#C83E31]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：下午三點跟老闆 1-on-1、看牙醫..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-sm font-sans font-bold text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483] shadow-xs"
            />
          </div>

          {/* 5. Optional Notes / Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#6E6A63]" />
              <span>備註或地點（選填）</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="輸入備註、會議室地點或提醒事項..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-xs font-sans text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483] resize-none"
            />
          </div>

          {/* 6. Live Roast Preview Box */}
          <div className="rounded-2xl border-2 border-[#2D2D2D]/20 bg-[#FFF8E7] p-3 space-y-1.5 shadow-inner">
            {matchedRoast ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C83E31] shrink-0 animate-pulse" />
                  <span className="font-serif font-black text-xs text-[#C83E31]">
                    ✨ 此行程將觸發專屬幹話：【{matchedRoast.eventLabel}】
                  </span>
                </div>
                <p className="font-serif font-bold text-xs text-[#2D2D2D] leading-relaxed">
                  「{matchedRoast.quote}」
                </p>
                <p className="text-[10px] font-sans text-[#6E6A63]">
                  {matchedRoast.subtext}
                </p>
                <div className="text-[11px] font-sans text-[#785A3C] pt-1 border-t border-[#C83E31]/15">
                  <span className="font-bold text-[#C83E31]">宜：</span> {matchedRoast.yi}
                </div>
              </div>
            ) : (
              <div className="text-center py-1 text-xs font-sans text-[#6E6A63]">
                <p className="font-bold text-[#2D2D2D]">💡 社畜智能開酸提示</p>
                <p className="text-[11px] mt-0.5">
                  輸入或點選「家庭聚餐」、「1-on-1」、「喝喜酒」、「看牙醫」等關鍵字，將為該日解鎖專屬吐槽！
                </p>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#2D2D2D]/15">
            {editingEvent && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 rounded-xl border-2 border-[#C83E31] text-[#C83E31] hover:bg-[#C83E31]/10 text-xs font-sans font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除行程</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border-2 border-[#2D2D2D]/20 text-[#6E6A63] hover:text-[#2D2D2D] text-xs font-sans font-bold transition cursor-pointer"
              >
                取消
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl border-2 border-[#2D2D2D] bg-[#2D2D2D] hover:bg-[#1a1a1a] text-[#F9F6F0] text-xs font-sans font-black flex items-center gap-1.5 shadow-[0_3px_0_#D4B483] active:scale-95 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-[#D4B483]" />
                <span>{editingEvent ? '更新行程' : '儲存行程'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
