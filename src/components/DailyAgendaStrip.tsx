import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Calendar,
  Plus,
  Edit2,
  Clock,
  MapPin,
  FileText,
  Tag,
  Sparkles,
  Bell,
  Copy,
  Check,
} from 'lucide-react';
import { CalendarMeeting } from '../services/calendarService';
import { BirthdayWishGenerator } from './BirthdayWishGenerator';

interface DailyAgendaStripProps {
  events: CalendarMeeting[];
  allEvents?: CalendarMeeting[];
  currentDateKey?: string;
  todayDateKey?: string;
  isFuture?: boolean;
  onOpenSyncModal: () => void;
  onOpenAddEvent?: (targetDateKey?: string) => void;
  onEditEvent?: (event: CalendarMeeting) => void;
  onShowToast?: (msg: string) => void;
}

/**
 * Auto-generate funny 1-line sarcastic roast tag for meetings
 */
export function generateMeetingRoastTag(title: string, startHour: number): string {
  const lower = title.toLowerCase();

  if (startHour >= 16) {
    return '下班前最後掙扎';
  }
  if (startHour <= 9) {
    return '求生意志開箱中';
  }
  if (lower.includes('1-on-1') || lower.includes('review') || title.includes('面談') || title.includes('考核')) {
    return '微笑點頭模式';
  }
  if (title.includes('週會') || title.includes('例會') || title.includes('早會') || title.includes('夕會')) {
    return '左耳進右耳出';
  }
  if (title.includes('客戶') || title.includes('提案') || lower.includes('pitch') || title.includes('外部')) {
    return '心平氣和阿彌陀佛';
  }
  if (lower.includes('all hands') || title.includes('全員') || title.includes('大會')) {
    return '集體通靈摸魚';
  }
  if (title.includes('急件') || title.includes('緊急') || lower.includes('sync')) {
    return '靈魂暫時出竅';
  }
  if (title.includes('培訓') || title.includes('分享') || lower.includes('workshop')) {
    return '帶薪光明正大放空';
  }
  if (title.includes('家庭') || title.includes('聚餐') || title.includes('親戚')) {
    return '年菜塞滿嘴應付中';
  }
  if (title.includes('喜酒') || title.includes('婚禮')) {
    return '紅色炸彈肉痛中';
  }
  if (title.includes('尾牙') || title.includes('春酒')) {
    return '假笑敬酒抽大獎';
  }
  if (title.includes('牙醫') || title.includes('看醫生') || title.includes('診所')) {
    return '帶薪看病逃離辦公室';
  }
  if (title.includes('約會')) {
    return '準時落跑誰也別想加班';
  }
  if (title.includes('特休') || title.includes('請假') || title.includes('休假')) {
    return '關通知人間蒸發模式';
  }
  if (
    lower.includes('school') ||
    lower.includes('bskl') ||
    lower.includes('parent') ||
    lower.includes('schoolsbuddy') ||
    lower.includes('football') ||
    lower.includes('cross country') ||
    lower.includes('book club') ||
    lower.includes('cello') ||
    lower.includes('piano') ||
    title.includes('才藝') ||
    title.includes('補習') ||
    title.includes('學校')
  ) {
    return '小孩司機兼金主上線';
  }

  // Rotating default sarcastic tags
  const defaults = [
    '保持微笑呼吸',
    '戰術性點頭附和',
    '肉體出席靈魂請假',
    '假裝螢幕上有重大bug',
    '眼神渙散高階防禦',
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash += title.charCodeAt(i);
  return defaults[Math.abs(hash) % defaults.length];
}

const WEEKDAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export const DailyAgendaStrip: React.FC<DailyAgendaStripProps> = ({
  events,
  allEvents = [],
  currentDateKey,
  todayDateKey,
  isFuture = false,
  onOpenSyncModal,
  onOpenAddEvent,
  onEditEvent,
  onShowToast,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Compute reference real today key
  const effectiveTodayKey = useMemo(() => {
    if (todayDateKey) return todayDateKey;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [todayDateKey]);

  // Compute next 7 days list: [today + 1 ... today + 7]
  const next7DaysInfo = useMemo(() => {
    const list: Array<{
      dateKey: string;
      label: string;
      monthDay: string;
      weekday: string;
      relativeBadge: string;
    }> = [];

    const [tY, tM, tD] = effectiveTodayKey.split('-').map(Number);
    const baseDate = new Date(tY, tM - 1, tD);

    for (let i = 1; i <= 7; i++) {
      const nextD = new Date(baseDate);
      nextD.setDate(baseDate.getDate() + i);

      const y = nextD.getFullYear();
      const m = nextD.getMonth() + 1;
      const d = nextD.getDate();
      const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const weekday = WEEKDAY_NAMES[nextD.getDay()];
      const monthDay = `${m}/${d}`;

      let relativeBadge = '';
      if (i === 1) relativeBadge = '明天';
      else if (i === 2) relativeBadge = '後天';

      list.push({
        dateKey,
        label: `${monthDay} (${weekday})`,
        monthDay,
        weekday,
        relativeBadge,
      });
    }
    return list;
  }, [effectiveTodayKey]);

  // Upcoming 7 days events filtered & sorted
  const upcoming7DaysEvents = useMemo(() => {
    const dateKeysSet = new Set(next7DaysInfo.map((d) => d.dateKey));
    return allEvents
      .filter((ev) => ev.dateKey && dateKeysSet.has(ev.dateKey))
      .sort((a, b) => {
        if (a.dateKey !== b.dateKey) return (a.dateKey || '').localeCompare(b.dateKey || '');
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        if (a.startHour !== b.startHour) return a.startHour - b.startHour;
        return a.startMinute - b.startMinute;
      });
  }, [allEvents, next7DaysInfo]);

  // Next up 3 events across upcoming days for quick preview inside Today view
  const nextUp3Events = useMemo(() => {
    return upcoming7DaysEvents.slice(0, 3);
  }, [upcoming7DaysEvents]);

  // Group upcoming events by dateKey for 7-day tab
  const upcomingGroupedByDate = useMemo(() => {
    const map = new Map<string, CalendarMeeting[]>();
    for (const info of next7DaysInfo) {
      map.set(info.dateKey, []);
    }
    for (const ev of upcoming7DaysEvents) {
      if (ev.dateKey && map.has(ev.dateKey)) {
        map.get(ev.dateKey)!.push(ev);
      }
    }
    return map;
  }, [next7DaysInfo, upcoming7DaysEvents]);

  const birthdayEvent = events.find((evt) => {
    const t = `${evt.title || ''} ${evt.calendarName || ''}`.toLowerCase();
    return ['birthday', 'bday', '生日', '慶生'].some((k) => t.includes(k));
  });

  const formatTime = (h: number, m: number, isAllDay?: boolean) => {
    if (isAllDay) return '全天';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const formatTimeRange = (
    startHour: number,
    startMinute: number,
    durationMinutes: number,
    isAllDay?: boolean
  ) => {
    if (isAllDay) return '全天活動 (All Day)';
    const sStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const totalMin = startHour * 60 + startMinute + (durationMinutes || 60);
    const endHour = Math.floor(totalMin / 60) % 24;
    const endMin = totalMin % 60;
    const eStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    let durStr = '';
    const dur = durationMinutes || 60;
    if (dur < 60) {
      durStr = `${dur} 分鐘`;
    } else {
      const h = Math.floor(dur / 60);
      const m = dur % 60;
      durStr = m > 0 ? `${h} 小時 ${m} 分鐘` : `${h} 小時`;
    }
    return `${sStr} – ${eStr} (約 ${durStr})`;
  };

  const toggleExpandEvent = (eventId: string) => {
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

  const toggleExpandAll = (list: CalendarMeeting[]) => {
    if (expandedEventIds.size === list.length) {
      setExpandedEventIds(new Set());
    } else {
      setExpandedEventIds(new Set(list.map((e) => e.id)));
    }
  };

  const handleCopyEventDetails = async (evt: CalendarMeeting) => {
    const timeStr = formatTimeRange(evt.startHour, evt.startMinute, evt.durationMinutes, evt.isAllDay);
    let text = `【${evt.title}】\n📅 時間：${evt.dateKey || ''} ${timeStr}`;
    if (evt.location) {
      text += `\n📍 地點：${evt.location}`;
    }
    if (evt.calendarName) {
      text += `\n📂 日曆：${evt.calendarName}`;
    }
    if (evt.notes) {
      text += `\n📝 備忘說明：\n${evt.notes}`;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedEventId(evt.id);
      setTimeout(() => setCopiedEventId(null), 2500);
      if (onShowToast) {
        onShowToast('已複製行程詳細內容至剪貼簿！');
      }
    } catch {
      if (onShowToast) {
        onShowToast('複製失敗，請手動選取文字');
      }
    }
  };

  const renderSingleEventItem = (evt: CalendarMeeting) => {
    const tag = generateMeetingRoastTag(evt.title, evt.startHour);
    const isCustom = evt.source === 'local';
    const isExpanded = expandedEventIds.has(evt.id);

    return (
      <div
        key={evt.id}
        className={`rounded-xl border transition-all overflow-hidden ${
          isExpanded
            ? 'bg-white border-[#2D2D2D] shadow-sm my-1.5'
            : 'bg-white/60 border-[#2D2D2D]/10 hover:border-[#2D2D2D]/30 hover:bg-white'
        }`}
      >
        {/* Summary Row */}
        <div
          onClick={() => toggleExpandEvent(evt.id)}
          className="flex items-center justify-between text-xs font-sans text-[#2D2D2D] py-2 px-2.5 cursor-pointer transition select-none"
          title={isExpanded ? '點擊收合詳細資訊' : '點擊查看完整行程內容、地點與備忘'}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
            <span
              className={`w-1.5 h-3.5 rounded-full shrink-0 ${
                isCustom ? 'bg-[#D4B483]' : 'bg-[#C83E31]'
              }`}
            />
            <span className="font-mono font-bold text-[#6E6A63] shrink-0 text-[11px]">
              {formatTime(evt.startHour, evt.startMinute, evt.isAllDay)}
            </span>

            {evt.calendarName && (
              <span
                className="text-[9px] px-1.5 py-0.2 rounded font-sans font-medium shrink-0 max-w-[85px] truncate border"
                style={{
                  backgroundColor: evt.calendarColor ? `${evt.calendarColor}18` : '#2D2D2D10',
                  borderColor: evt.calendarColor ? `${evt.calendarColor}50` : '#2D2D2D25',
                  color: evt.calendarColor || '#2D2D2D',
                }}
                title={evt.calendarName}
              >
                {evt.calendarName}
              </span>
            )}

            <span
              className={`font-bold text-[#2D2D2D] leading-snug ${
                isExpanded ? 'break-words' : 'truncate'
              }`}
            >
              {evt.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {evt.reminders && evt.reminders.length > 0 && (
              <span
                className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-0.5 shadow-2xs"
                title={`已設定 ${evt.reminders.length} 組提醒`}
              >
                🔔 x{evt.reminders.length}
              </span>
            )}

            {!isExpanded && (
              <span className="text-[#6E6A63] font-medium text-[10px] hidden sm:inline">
                ({tag})
              </span>
            )}

            {isCustom && !isExpanded && (
              <span className="text-[9px] px-1 rounded bg-[#D4B483]/20 text-[#785A3C] font-bold">
                自訂
              </span>
            )}

            <div
              className={`p-0.5 rounded text-[#6E6A63] hover:text-[#2D2D2D] transition-transform duration-200 ${
                isExpanded ? 'rotate-180 text-[#C83E31]' : ''
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Expanded Full Details */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-[#2D2D2D]/10 bg-[#FAF7F0]/80 space-y-2.5 text-xs font-sans animate-in fade-in duration-200 select-text">
            {/* 1. Full Untruncated Title */}
            <div className="space-y-0.5 pt-0.5">
              <div className="text-[10px] font-sans font-bold text-[#8C877D] flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#C83E31]" />
                <span>完整行程名稱</span>
              </div>
              <p className="font-serif font-black text-sm text-[#2D2D2D] leading-relaxed break-words">
                {evt.title}
              </p>
            </div>

            {/* 2. Full Time & Duration */}
            <div className="flex items-center gap-2 text-xs text-[#2D2D2D]">
              <Clock className="w-3.5 h-3.5 text-[#6E6A63] shrink-0" />
              <span className="font-mono font-bold text-[#2D2D2D]">
                {formatTimeRange(
                  evt.startHour,
                  evt.startMinute,
                  evt.durationMinutes,
                  evt.isAllDay
                )}
              </span>
            </div>

            {/* 3. Calendar Source & Origin */}
            <div className="flex items-center gap-2 text-[11px] text-[#6E6A63] flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-[#6E6A63] shrink-0" />
              <span className="font-medium">所屬日曆：</span>
              <span
                className="px-2 py-0.5 rounded font-bold border text-[10px]"
                style={{
                  backgroundColor: evt.calendarColor ? `${evt.calendarColor}18` : '#2D2D2D10',
                  borderColor: evt.calendarColor ? `${evt.calendarColor}50` : '#2D2D2D25',
                  color: evt.calendarColor || '#2D2D2D',
                }}
              >
                {evt.calendarName || (isCustom ? '本地自訂行程' : '手機日曆')}
              </span>
              <span className="text-[10px] text-[#8C877D]">
                ({isCustom ? '本地自訂' : '手機系統同步'})
              </span>
            </div>

            {/* 4. Location (if present) */}
            {evt.location && (
              <div className="flex items-start gap-2 text-xs text-[#2D2D2D] bg-white p-2 rounded-xl border border-[#2D2D2D]/10">
                <MapPin className="w-3.5 h-3.5 text-[#C83E31] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[#6E6A63] text-[10px] block">活動地點</span>
                  <span className="font-medium text-[#2D2D2D] break-words">
                    {evt.location}
                  </span>
                </div>
              </div>
            )}

            {/* 5. Notes / Description (if present) */}
            {evt.notes && (
              <div className="space-y-1">
                <div className="text-[10px] font-sans font-bold text-[#8C877D] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#6E6A63]" />
                  <span>備忘與詳細說明</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#2D2D2D]/15 text-xs text-[#2D2D2D] leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {evt.notes}
                </div>
              </div>
            )}

            {/* 6. Sarcastic Roast Advice Tag */}
            <div className="p-2 rounded-xl bg-[#F3EFE6] border border-[#2D2D2D]/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#C83E31] font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>社畜防禦建議：</span>
                <span className="text-[#2D2D2D] font-normal">{tag}</span>
              </div>
            </div>

            {/* 7. Reminders list (if set) */}
            {evt.reminders && evt.reminders.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-[#785A3C] bg-amber-50 p-2 rounded-xl border border-amber-200">
                <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  已設定 {evt.reminders.length} 組通知：
                  {evt.reminders.map((r, i) => (
                    <span key={r.id} className="font-bold ml-1">
                      {r.value}{' '}
                      {r.unit === 'hours' ? '小時' : r.unit === 'days' ? '天' : '分鐘'}前
                      {i < (evt.reminders?.length || 0) - 1 ? '、' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* 8. Action Buttons Strip */}
            <div className="flex items-center justify-between pt-1 border-t border-[#2D2D2D]/10 text-[11px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyEventDetails(evt);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#2D2D2D]/20 hover:bg-[#F3EFE6] text-[#2D2D2D] font-bold shadow-2xs cursor-pointer active:scale-95 transition"
                title="複製完整行程資訊"
              >
                {copiedEventId === evt.id ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">已複製明細</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#6E6A63]" />
                    <span>複製行程明細</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {isCustom && onEditEvent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEvent(evt);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D2D2D] hover:bg-[#C83E31] text-[#FAF7F0] font-bold shadow-2xs cursor-pointer active:scale-95 transition"
                  >
                    <Edit2 className="w-3 h-3 text-[#D4B483]" />
                    <span>編輯行程</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpandEvent(evt.id);
                  }}
                  className="text-[11px] text-[#6E6A63] hover:text-[#2D2D2D] underline cursor-pointer px-1"
                >
                  收合
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[390px] mx-auto select-none mt-2">
      <div className="rounded-2xl paper-texture border-2 border-[#2D2D2D] shadow-[0_4px_0_#2D2D2D] overflow-hidden bg-[#FAF7F0]">
        {/* Strip Header with 2-Tab Pill Toggle */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-[#2D2D2D]/10 bg-[#FAF7F0] select-none">
          {/* 2-Tab Pill Toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[#2D2D2D]/5 border border-[#2D2D2D]/10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('today');
                setIsOpen(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-[#2D2D2D] text-[#FAF7F0] shadow-xs'
                  : 'text-[#6E6A63] hover:text-[#2D2D2D]'
              }`}
            >
              <span>📋</span>
              <span>{isFuture ? '當日預約' : '當日'}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-[#2D2D2D]/10 text-[#6E6A63]'
                }`}
              >
                {events.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('upcoming');
                setIsOpen(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-[#2D2D2D] text-[#FAF7F0] shadow-xs'
                  : 'text-[#6E6A63] hover:text-[#2D2D2D]'
              }`}
            >
              <span>🗓️</span>
              <span>未來 7 天</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'upcoming' ? 'bg-[#C83E31] text-white' : 'bg-[#2D2D2D]/10 text-[#6E6A63]'
                }`}
              >
                {upcoming7DaysEvents.length}
              </span>
            </button>
          </div>

          {/* Right Action Icons & Expand/Collapse */}
          <div className="flex items-center gap-1.5">
            {birthdayEvent && activeTab === 'today' && (
              <span className="hidden sm:flex px-2 py-0.5 rounded-full text-[10px] font-sans font-black bg-[#C83E31] text-[#FAF7F0] items-center gap-1 shadow-2xs">
                <span>🎂 壽星</span>
              </span>
            )}

            {onOpenAddEvent && (
              <button
                type="button"
                onClick={() => onOpenAddEvent()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2D2D2D] hover:bg-[#C83E31] text-[#F9F6F0] text-[10px] font-sans font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="新增自訂行程"
              >
                <Plus className="w-3 h-3 text-[#D4B483]" />
                <span className="hidden sm:inline">新增</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSyncModal}
              className="text-[11px] font-sans font-bold text-[#6E6A63] hover:text-[#2D2D2D] flex items-center gap-1 cursor-pointer transition px-1.5 py-1 rounded-lg hover:bg-[#2D2D2D]/5"
              title="行事曆同步設定"
            >
              <Calendar className="w-3.5 h-3.5 text-[#C83E31]" />
              <span className="text-[10px] sm:text-[11px]">連動</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-[#6E6A63] hover:text-[#2D2D2D] cursor-pointer"
              title={isOpen ? '收合行程卡片' : '展開行程卡片'}
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="px-3 pb-3 pt-1 space-y-2">
            {/* View A: 當日 (Today / Current Selected Date) */}
            {activeTab === 'today' && (
              <div className="space-y-2 animate-in fade-in duration-150">
                {/* 壽星幹話祝賀詞產生器 (一鍵複製) */}
                {birthdayEvent && (
                  <BirthdayWishGenerator
                    eventName={birthdayEvent.title}
                    onShowToast={onShowToast}
                    className="mt-1"
                  />
                )}

                {events.length === 0 ? (
                  <div className="py-3 text-center text-xs font-sans text-[#6E6A63] space-y-1">
                    <p className="font-bold text-[#2D2D2D]">今日行事曆一片淨土 🏖️</p>
                    <p className="text-[11px]">薪水小偷模式全面啟動，零干擾專注當個空氣。</p>
                    {onOpenAddEvent && (
                      <button
                        type="button"
                        onClick={() => onOpenAddEvent()}
                        className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-[#C83E31] hover:underline pt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>立即新增第一筆行程</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-sans text-[#8C877D] px-1">
                      <span>💡 點擊任一行程即可展開查看地點與備忘</span>
                      <button
                        type="button"
                        onClick={() => toggleExpandAll(events)}
                        className="font-bold text-[#6E6A63] hover:text-[#2D2D2D] underline cursor-pointer"
                      >
                        {expandedEventIds.size === events.length ? '全部收合' : '全部展開'}
                      </button>
                    </div>

                    {events.map((evt) => renderSingleEventItem(evt))}
                  </div>
                )}

                {/* Compact Next Up Preview: Show next 3 upcoming events across coming days */}
                {upcoming7DaysEvents.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#2D2D2D]/15">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">🗓️</span>
                        <span className="text-xs font-serif font-black text-[#2D2D2D]">
                          接下來行程預告 (Next Up)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('upcoming')}
                        className="text-[10px] font-sans font-bold text-[#C83E31] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>查看未來 7 天 ({upcoming7DaysEvents.length})</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {nextUp3Events.map((evt) => {
                        const dateInfo = next7DaysInfo.find((d) => d.dateKey === evt.dateKey);
                        const badgeText = dateInfo?.relativeBadge
                          ? `[${dateInfo.relativeBadge} ${dateInfo.monthDay}]`
                          : `[${dateInfo?.monthDay || evt.dateKey} ${dateInfo?.weekday || ''}]`;
                        const tag = generateMeetingRoastTag(evt.title, evt.startHour);

                        return (
                          <div
                            key={evt.id}
                            onClick={() => {
                              setActiveTab('upcoming');
                              toggleExpandEvent(evt.id);
                            }}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-white border border-[#2D2D2D]/10 hover:border-[#2D2D2D]/30 hover:bg-amber-50/40 transition cursor-pointer select-none"
                            title="點擊切換至未來 7 天檢視"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-[#C83E31]/10 text-[#C83E31] shrink-0 border border-[#C83E31]/20">
                                {badgeText}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-[#6E6A63] shrink-0">
                                {formatTime(evt.startHour, evt.startMinute, evt.isAllDay)}
                              </span>
                              <span className="font-bold text-[#2D2D2D] truncate text-[11px]">
                                {evt.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#8C877D] shrink-0 hidden sm:inline">
                              ({tag})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View B: 未來 7 天 (Next 7 Days Grouped View) */}
            {activeTab === 'upcoming' && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] font-sans text-[#6E6A63] px-1">
                  <span className="font-bold text-[#2D2D2D]">
                    🗓️ 未來一週行程排程 ({upcoming7DaysEvents.length} 場)
                  </span>
                  {onOpenAddEvent && (
                    <button
                      type="button"
                      onClick={() => onOpenAddEvent()}
                      className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-[#C83E31] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新增未來行程</span>
                    </button>
                  )}
                </div>

                {upcoming7DaysEvents.length === 0 ? (
                  <div className="py-6 text-center text-xs font-sans text-[#6E6A63] space-y-1 bg-white/50 rounded-xl border border-dashed border-[#2D2D2D]/20">
                    <p className="font-bold text-[#2D2D2D]">未來 7 天目前尚無任何排定行程 🎉</p>
                    <p className="text-[11px]">保持行事曆潔淨，或是點擊上方新增自訂待辦與行程！</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {next7DaysInfo.map((info) => {
                      const dayEvents = upcomingGroupedByDate.get(info.dateKey) || [];
                      if (dayEvents.length === 0) return null;

                      return (
                        <div key={info.dateKey} className="space-y-1.5">
                          {/* Date Group Header */}
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-serif font-black text-xs text-[#2D2D2D]">
                                {info.label}
                              </span>
                              {info.relativeBadge && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#C83E31] text-white">
                                  {info.relativeBadge}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-[#8C877D]">
                                ({dayEvents.length} 場)
                              </span>
                            </div>

                            {onOpenAddEvent && (
                              <button
                                type="button"
                                onClick={() => onOpenAddEvent(info.dateKey)}
                                className="text-[10px] font-sans font-bold text-[#6E6A63] hover:text-[#C83E31] flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>加到這天</span>
                              </button>
                            )}
                          </div>

                          {/* Events List for this date */}
                          <div className="space-y-1">
                            {dayEvents.map((evt) => renderSingleEventItem(evt))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
