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
  Bell,
  BellOff,
  Plus,
  MapPin,
  FolderOpen,
} from 'lucide-react';
import {
  CalendarMeeting,
  CustomCalendarEvent,
  DeviceCalendarSource,
  EventReminder,
  fetchDeviceCalendars,
} from '../services/calendarService';
import specialEventsData from '../data/special_events_quotes.json';
import { SpecialEventQuote } from '../utils/eventRoastMatcher';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  editingEvent?: (CustomCalendarEvent | CalendarMeeting) | null;
  onSave: (event: CustomCalendarEvent, targetCalendarId?: string) => void;
  onDelete?: (eventId: string, eventObj?: CustomCalendarEvent | CalendarMeeting) => void;
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
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notificationsDisabled, setNotificationsDisabled] = useState(false);
  const [reminders, setReminders] = useState<EventReminder[]>([
    { id: 'rem_1', value: 10, unit: 'minutes' },
  ]);
  const [writableCalendars, setWritableCalendars] = useState<DeviceCalendarSource[]>([]);
  const [targetCalendarId, setTargetCalendarId] = useState<string>('local');

  // Load writable Google / Android calendars when creating a new event
  useEffect(() => {
    if (!isOpen || editingEvent) return;
    let cancelled = false;
    fetchDeviceCalendars()
      .then((cals) => {
        if (cancelled) return;
        const writable = cals.filter((c) =>
          typeof c.accessLevel === 'number' ? c.accessLevel >= 500 : c.isReadOnly === false
        );
        setWritableCalendars(writable);

        let savedDefault: string | null = null;
        try {
          savedDefault = localStorage.getItem('default_write_calendar_id');
        } catch {}

        if (savedDefault && (savedDefault === 'local' || writable.some((c) => c.id === savedDefault))) {
          setTargetCalendarId(savedDefault);
        } else {
          const primary = writable.find((c) => c.isPrimary) || writable[0];
          setTargetCalendarId(primary ? primary.id : 'local');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWritableCalendars([]);
          setTargetCalendarId('local');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, editingEvent]);

  // Sync state when opening modal or changing editing event
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (editingEvent) {
        setTitle(editingEvent.title);
        setDateKey(editingEvent.dateKey || initialDate || getTodayStr());
        setIsAllDay(Boolean(editingEvent.isAllDay));
        const sH = String(editingEvent.startHour ?? 9).padStart(2, '0');
        const sM = String(editingEvent.startMinute ?? 0).padStart(2, '0');
        setStartTime(`${sH}:${sM}`);

        const totalMinutes = (editingEvent.startHour ?? 9) * 60 + (editingEvent.startMinute ?? 0) + (editingEvent.durationMinutes ?? 60);
        const eH = String(Math.floor((totalMinutes / 60) % 24)).padStart(2, '0');
        const eM = String(totalMinutes % 60).padStart(2, '0');
        setEndTime(`${eH}:${eM}`);
        setLocation(editingEvent.location || '');
        setNotes(editingEvent.notes || '');

        const disabled = Boolean(editingEvent.notificationsDisabled);
        setNotificationsDisabled(disabled);

        if (disabled) {
          setReminders([]);
        } else if (editingEvent.reminders && editingEvent.reminders.length > 0) {
          setReminders(editingEvent.reminders);
        } else {
          // Default to 10 mins before (or 0 mins for all-day) matching native bridge behavior
          setReminders([{ id: 'rem_1', value: editingEvent.isAllDay ? 0 : 10, unit: 'minutes' }]);
        }
      } else {
        const defaults = getUpcomingDefaultTimes();
        setTitle('');
        setDateKey(initialDate || getTodayStr());
        setIsAllDay(false);
        setStartTime(defaults.start);
        setEndTime(defaults.end);
        setLocation('');
        setNotes('');
        setNotificationsDisabled(false);
        setReminders([{ id: 'rem_1', value: 10, unit: 'minutes' }]);
      }
    }
  }, [isOpen, editingEvent, initialDate]);

  const handleAddReminder = (
    val = 10,
    unit: 'minutes' | 'hours' | 'days' | 'exact' = 'minutes'
  ) => {
    setNotificationsDisabled(false);
    if (reminders.length >= 3) return;
    const newRem: EventReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      value: val,
      unit,
      ...(unit === 'exact' ? { exactDate: dateKey, exactTime: startTime } : {}),
    };
    setReminders((prev) => [...prev, newRem]);
  };

  const handleRemoveReminder = (id: string) => {
    setReminders((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) {
        setNotificationsDisabled(true);
      }
      return next;
    });
  };

  const handleUpdateReminder = (id: string, updates: Partial<EventReminder>) => {
    setNotificationsDisabled(false);
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...updates };
        if (updates.unit === 'exact') {
          merged.exactDate = merged.exactDate || dateKey;
          merged.exactTime = merged.exactTime || startTime;
        }
        return merged;
      })
    );
  };

  // Helper to preview exact notification trigger time string
  const computeReminderPreview = (rem: EventReminder): string => {
    if (rem.unit === 'exact') {
      const dStr = rem.exactDate || dateKey;
      const tStr = rem.exactTime || startTime;
      return `將於 ${dStr} ${tStr} 發送通知`;
    }
    const [y, m, d] = dateKey.split('-').map(Number);
    const [sH, sM] = (isAllDay ? '09:00' : startTime).split(':').map(Number);
    const eventDt = new Date(y, (m || 1) - 1, d || 1, sH || 0, sM || 0, 0);
    let offsetMs = 0;
    if (rem.unit === 'minutes') offsetMs = rem.value * 60 * 1000;
    else if (rem.unit === 'hours') offsetMs = rem.value * 3600 * 1000;
    else if (rem.unit === 'days') offsetMs = rem.value * 86400 * 1000;
    const trigDt = new Date(eventDt.getTime() - offsetMs);
    const tY = trigDt.getFullYear();
    const tMo = String(trigDt.getMonth() + 1).padStart(2, '0');
    const tD = String(trigDt.getDate()).padStart(2, '0');
    const tH = String(trigDt.getHours()).padStart(2, '0');
    const tMin = String(trigDt.getMinutes()).padStart(2, '0');
    return `預計於 ${tY}-${tMo}-${tD} ${tH}:${tMin} 提醒`;
  };

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

    const [y, m, d] = dateKey.split('-').map(Number);
    const startDateObj = new Date(y, (m || 1) - 1, d || 1, isAllDay ? 0 : startHour, isAllDay ? 0 : startMinute, 0);
    const endDateObj = isAllDay
      ? new Date(y, (m || 1) - 1, d || 1, 23, 59, 59)
      : new Date(startDateObj.getTime() + durationMinutes * 60 * 1000);

    const selectedCal = writableCalendars.find((c) => c.id === targetCalendarId);

    const newEvent: CustomCalendarEvent = {
      id: editingEvent ? editingEvent.id : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      dateKey,
      start: startDateObj.toISOString(),
      end: endDateObj.toISOString(),
      startHour: isAllDay ? 9 : startHour,
      startMinute: isAllDay ? 0 : startMinute,
      durationMinutes: isAllDay ? 480 : durationMinutes,
      isAllDay,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      reminders: notificationsDisabled ? [] : reminders,
      notificationsDisabled,
      source: editingEvent?.source || 'local',
      calendarName: editingEvent?.calendarName || selectedCal?.name,
      calendarColor: editingEvent?.calendarColor || selectedCal?.color,
      createdAt: (editingEvent as CustomCalendarEvent | undefined)?.createdAt || Date.now(),
    };

    onSave(newEvent, !editingEvent ? targetCalendarId : undefined);
    onClose();
  };

  const handleDelete = () => {
    if (editingEvent && onDelete) {
      onDelete(editingEvent.id, editingEvent);
      onClose();
    }
  };

  const isSyncedEvent = Boolean(editingEvent && editingEvent.source && editingEvent.source !== 'local');

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
              {editingEvent ? (isSyncedEvent ? '編輯同步行程與通知' : '編輯社畜行程') : '新增社畜行程'}
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

          {isSyncedEvent && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-sans leading-relaxed">
              📡 <strong>同步連動行程：</strong>您可以自由修改下方的「通知時間」、行程時間與備忘，或點擊底部「刪除行程」將其從日曆中隱藏移除。
            </div>
          )}

          {/* Target Google / Android Calendar Selector (for new events) */}
          {!editingEvent && (
            <div className="space-y-1.5">
              <label className="block text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-[#C83E31]" />
                <span>📂 儲存至行事曆</span>
              </label>
              <select
                value={targetCalendarId}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetCalendarId(val);
                  try {
                    localStorage.setItem('default_write_calendar_id', val);
                  } catch {}
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-xs font-sans font-bold text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483] shadow-xs cursor-pointer"
              >
                {writableCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                    {cal.accountName && cal.accountName !== cal.name ? ` (${cal.accountName})` : ''}
                    {cal.isPrimary ? ' ★預設' : ''}
                  </option>
                ))}
                <option value="local">📱 僅儲存在幹話日曆 (本機)</option>
              </select>
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

          {/* 5. Optional Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C83E31]" />
              <span>地點（選填）</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例如：3 樓第一會議室、學校操場、Zoom 線上..."
              className="w-full px-3.5 py-2 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-xs font-sans text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483]"
            />
          </div>

          {/* 6. Optional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#6E6A63]" />
              <span>備忘與詳細說明（選填）</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="輸入備忘事項、討論題綱、提醒或重要資訊..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border-2 border-[#2D2D2D] bg-[#F9F6F0] text-xs font-sans text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#D4B483] resize-none"
            />
          </div>

          {/* 6. Appointment Reminders (支持相對時間、指定精準通知時間與關閉通知) */}
          <div className="space-y-2.5 pt-2 border-t border-[#2D2D2D]/10">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-serif font-black text-[#2D2D2D] flex items-center gap-1.5">
                {notificationsDisabled ? (
                  <BellOff className="w-3.5 h-3.5 text-[#6E6A63]" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-[#C83E31]" />
                )}
                <span>行程通知時間設定</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  if (notificationsDisabled) {
                    setNotificationsDisabled(false);
                    if (reminders.length === 0) {
                      setReminders([{ id: `rem_${Date.now()}`, value: 10, unit: 'minutes' }]);
                    }
                  } else {
                    setNotificationsDisabled(true);
                  }
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-bold border transition cursor-pointer flex items-center gap-1 ${
                  notificationsDisabled
                    ? 'bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {notificationsDisabled ? (
                  <>
                    <BellOff className="w-3 h-3" />
                    <span>已關閉通知（點此開啟）</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3" />
                    <span>通知已開啟（{reminders.length}/3 組）</span>
                  </>
                )}
              </button>
            </div>

            {notificationsDisabled ? (
              <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-center text-xs font-sans text-stone-500">
                🔕 此行程將不會發送任何手機推播通知。
              </div>
            ) : (
              <>
                {/* Reminder rows */}
                <div className="space-y-2">
                  {reminders.map((rem, idx) => (
                    <div
                      key={rem.id}
                      className="bg-[#F9F6F0] p-2.5 rounded-xl border-2 border-[#2D2D2D]/20 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                        <span className="text-[11px] font-serif font-bold text-[#6E6A63] w-5 text-center shrink-0">
                          #{idx + 1}
                        </span>

                        {rem.unit !== 'exact' ? (
                          <input
                            type="number"
                            min="0"
                            max="1440"
                            value={rem.value}
                            onChange={(e) =>
                              handleUpdateReminder(rem.id, {
                                value: Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            }
                            className="w-16 px-2 py-1.5 rounded-lg border border-[#2D2D2D]/30 bg-white text-xs font-mono font-bold text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#D4B483]"
                          />
                        ) : null}

                        <select
                          value={rem.unit}
                          onChange={(e) =>
                            handleUpdateReminder(rem.id, {
                              unit: e.target.value as 'minutes' | 'hours' | 'days' | 'exact',
                            })
                          }
                          className="flex-1 min-w-[110px] px-2 py-1.5 rounded-lg border border-[#2D2D2D]/30 bg-white text-xs font-sans font-bold text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#D4B483] cursor-pointer"
                        >
                          <option value="minutes">分鐘前提醒（0=準時）</option>
                          <option value="hours">小時前提醒</option>
                          <option value="days">天前提醒</option>
                          <option value="exact">⏰ 指定日期與時間</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveReminder(rem.id)}
                          className="w-7 h-7 rounded-lg text-[#6E6A63] hover:text-[#C83E31] hover:bg-[#C83E31]/10 flex items-center justify-center transition cursor-pointer shrink-0 ml-auto"
                          title="移除此通知"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Exact date/time inputs when unit === 'exact' */}
                      {rem.unit === 'exact' && (
                        <div className="grid grid-cols-2 gap-2 pl-6 pt-0.5">
                          <input
                            type="date"
                            value={rem.exactDate || dateKey}
                            onChange={(e) =>
                              handleUpdateReminder(rem.id, { exactDate: e.target.value })
                            }
                            className="px-2 py-1 rounded-lg border border-[#2D2D2D]/30 bg-white text-[11px] font-mono font-bold text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#D4B483]"
                          />
                          <input
                            type="time"
                            value={rem.exactTime || startTime}
                            onChange={(e) =>
                              handleUpdateReminder(rem.id, { exactTime: e.target.value })
                            }
                            className="px-2 py-1 rounded-lg border border-[#2D2D2D]/30 bg-white text-[11px] font-mono font-bold text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#D4B483]"
                          />
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-[#785A3C] pl-6">
                        {computeReminderPreview(rem)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick reminder chips & Add button */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddReminder(0, 'minutes')}
                      disabled={reminders.length >= 3}
                      className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#FAF7F0] hover:bg-[#F2ECE1] text-[#2D2D2D] border border-[#2D2D2D]/20 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      + 準時
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddReminder(10, 'minutes')}
                      disabled={reminders.length >= 3}
                      className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#FAF7F0] hover:bg-[#F2ECE1] text-[#2D2D2D] border border-[#2D2D2D]/20 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      + 10分前
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddReminder(30, 'minutes')}
                      disabled={reminders.length >= 3}
                      className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#FAF7F0] hover:bg-[#F2ECE1] text-[#2D2D2D] border border-[#2D2D2D]/20 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      + 30分前
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddReminder(1, 'hours')}
                      disabled={reminders.length >= 3}
                      className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#FAF7F0] hover:bg-[#F2ECE1] text-[#2D2D2D] border border-[#2D2D2D]/20 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      + 1小時前
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddReminder(0, 'exact')}
                      disabled={reminders.length >= 3}
                      className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      + ⏰ 指定時間
                    </button>
                  </div>
                </div>
              </>
            )}
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

