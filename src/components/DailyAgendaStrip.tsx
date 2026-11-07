import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
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

interface DailyAgendaStripProps {
  events: CalendarMeeting[];
  isFuture?: boolean;
  onOpenSyncModal: () => void;
  onOpenAddEvent?: () => void;
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

export const DailyAgendaStrip: React.FC<DailyAgendaStripProps> = ({
  events,
  isFuture = false,
  onOpenSyncModal,
  onOpenAddEvent,
  onEditEvent,
  onShowToast,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

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

  const toggleExpandAll = () => {
    if (expandedEventIds.size === events.length) {
      setExpandedEventIds(new Set());
    } else {
      setExpandedEventIds(new Set(events.map((e) => e.id)));
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

  return (
    <div className="w-full max-w-[390px] mx-auto select-none mt-2">
      <div className="rounded-2xl paper-texture border-2 border-[#2D2D2D] shadow-[0_4px_0_#2D2D2D] overflow-hidden bg-[#FAF7F0]">
        {/* Strip Header */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#F3EFE6] transition select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="font-serif font-black text-sm text-[#2D2D2D] tracking-wide">
              {isFuture ? '當日預約行程' : '今日行程與吐槽'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2D2D2D]/10 text-[#6E6A63]">
              {events.length} 場
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Expand / Collapse All Toggle Button */}
            {events.length > 0 && isOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpandAll();
                }}
                className="px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#2D2D2D]/25 hover:border-[#2D2D2D] text-[#6E6A63] hover:text-[#2D2D2D] text-[10px] font-sans font-bold transition shadow-2xs cursor-pointer active:scale-95"
                title={expandedEventIds.size === events.length ? '收合所有明細' : '展開所有明細'}
              >
                <span>
                  {expandedEventIds.size === events.length ? '全部收合' : '展開明細'}
                </span>
              </button>
            )}

            {onOpenAddEvent && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddEvent();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2D2D2D] hover:bg-[#C83E31] text-[#F9F6F0] text-[10px] font-sans font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="新增自訂行程與社畜吐槽"
              >
                <Plus className="w-3 h-3 text-[#D4B483]" />
                <span>新增行程</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSyncModal();
              }}
              className="text-[11px] font-sans font-bold text-[#6E6A63] hover:text-[#2D2D2D] flex items-center gap-1 cursor-pointer transition ml-0.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#C83E31]" />
              <span className="hidden sm:inline">連動</span>
            </button>

            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-[#6E6A63]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6E6A63]" />
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-[#2D2D2D]/15 space-y-2">
            {events.length === 0 ? (
              <div className="py-2.5 text-center text-xs font-sans text-[#6E6A63] space-y-1">
                <p className="font-bold text-[#2D2D2D]">今日行事曆一片淨土 🏖️</p>
                <p className="text-[11px]">薪水小偷模式全面啟動，零干擾專注當個空氣。</p>
                {onOpenAddEvent && (
                  <button
                    type="button"
                    onClick={onOpenAddEvent}
                    className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-[#C83E31] hover:underline pt-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>立即新增第一筆行程</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-sans text-[#8C877D] px-1 flex items-center justify-between">
                  <span>💡 點擊任一行程即可展開查看完整內容與備忘</span>
                  <span className="font-mono text-[9px] text-[#A8A298]">
                    已展開 {expandedEventIds.size}/{events.length}
                  </span>
                </p>

                {events.map((evt) => {
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
                      {/* Summary Row (Click anywhere to expand/collapse) */}
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
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
