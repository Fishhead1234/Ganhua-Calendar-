import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Plus, Edit2 } from 'lucide-react';
import { CalendarMeeting } from '../services/calendarService';

interface DailyAgendaStripProps {
  events: CalendarMeeting[];
  isFuture?: boolean;
  onOpenSyncModal: () => void;
  onOpenAddEvent?: () => void;
  onEditEvent?: (event: CalendarMeeting) => void;
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
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const formatTime = (h: number, m: number, isAllDay?: boolean) => {
    if (isAllDay) return '全天';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

          <div className="flex items-center gap-2">
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
                <span>+ 新增行程</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSyncModal();
              }}
              className="text-[11px] font-sans font-bold text-[#6E6A63] hover:text-[#2D2D2D] flex items-center gap-1 cursor-pointer transition"
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
          <div className="px-4 pb-3 pt-1 border-t border-[#2D2D2D]/15 space-y-2">
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
                {events.map((evt) => {
                  const tag = generateMeetingRoastTag(evt.title, evt.startHour);
                  const isCustom = evt.source === 'local';

                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        if (isCustom && onEditEvent) {
                          onEditEvent(evt);
                        }
                      }}
                      className={`flex items-baseline justify-between text-xs font-sans text-[#2D2D2D] py-1 px-1.5 rounded-lg transition ${
                        isCustom ? 'hover:bg-[#F3EFE6] cursor-pointer' : ''
                      }`}
                      title={isCustom ? '點擊編輯此行程' : undefined}
                    >
                      <div className="flex items-baseline gap-2 min-w-0 pr-2">
                        <span
                          className={`w-1.5 h-3.5 rounded-full shrink-0 self-center ${
                            isCustom ? 'bg-[#D4B483]' : 'bg-[#C83E31]'
                          }`}
                        />
                        <span className="font-mono font-bold text-[#6E6A63] shrink-0 text-[11px]">
                          {formatTime(evt.startHour, evt.startMinute, evt.isAllDay)}
                        </span>
                        <span className="font-bold text-[#2D2D2D] truncate">
                          {evt.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[#6E6A63] font-medium text-[10px]">
                          ({tag})
                        </span>
                        {isCustom && (
                          <span className="text-[9px] px-1 rounded bg-[#D4B483]/20 text-[#785A3C] font-bold flex items-center gap-0.5">
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
      </div>
    </div>
  );
};
