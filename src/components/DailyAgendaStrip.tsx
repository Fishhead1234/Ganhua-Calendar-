import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, ExternalLink } from 'lucide-react';
import { CalendarMeeting } from '../services/calendarService';

interface DailyAgendaStripProps {
  events: CalendarMeeting[];
  isFuture?: boolean;
  onOpenSyncModal: () => void;
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
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const formatTime = (h: number, m: number) => {
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSyncModal();
              }}
              className="text-[11px] font-sans font-bold text-[#6E6A63] hover:text-[#2D2D2D] flex items-center gap-1 cursor-pointer transition"
            >
              <Calendar className="w-3.5 h-3.5 text-[#C83E31]" />
              <span>行事曆連動</span>
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
              <div className="py-2 text-center text-xs font-sans text-[#6E6A63]">
                <p className="font-bold text-[#2D2D2D]">今日行事曆一片淨土 🏖️</p>
                <p className="text-[11px] mt-0.5">薪水小偷模式全面啟動，零干擾專注當個空氣。</p>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                {events.map((evt) => {
                  const tag = generateMeetingRoastTag(evt.title, evt.startHour);
                  return (
                    <div
                      key={evt.id}
                      className="flex items-baseline gap-2 text-xs font-sans text-[#2D2D2D] py-0.5"
                    >
                      <span className="w-1.5 h-3.5 bg-[#C83E31] rounded-full shrink-0 self-center" />
                      <span className="font-mono font-bold text-[#6E6A63] shrink-0">
                        {formatTime(evt.startHour, evt.startMinute)}
                      </span>
                      <span className="font-bold text-[#2D2D2D] truncate">
                        {evt.title}
                      </span>
                      <span className="text-[#6E6A63] font-medium text-[11px] shrink-0">
                        ({tag})
                      </span>
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
