import React, { useState } from 'react';
import { Calendar, Sparkles, ChevronDown, Check, Lock } from 'lucide-react';
import {
  MOCK_CALENDAR_PRESETS,
  CalendarMeeting,
  CalendarRoastResult,
} from '../services/calendarRoastService';

interface CalendarSyncBarProps {
  isPro: boolean;
  isConnected: boolean;
  roastResult: CalendarRoastResult | null;
  onConnectCalendar: () => void;
  onSelectPreset: (meetings: CalendarMeeting[]) => void;
  onOpenPaywall: () => void;
}

export const CalendarSyncBar: React.FC<CalendarSyncBarProps> = ({
  isPro,
  isConnected,
  roastResult,
  onConnectCalendar,
  onSelectPreset,
  onOpenPaywall,
}) => {
  const [showPresets, setShowPresets] = useState(false);

  const handleClickMain = () => {
    if (!isPro) {
      onOpenPaywall();
      return;
    }
    if (!isConnected) {
      onConnectCalendar();
    } else {
      setShowPresets(!showPresets);
    }
  };

  return (
    <div className="w-full max-w-[390px] mx-auto relative select-none">
      <div
        className={`rounded-2xl border-2 transition-all p-2.5 flex items-center justify-between shadow-sm ${
          isConnected
            ? 'bg-[#FAF7F0] border-[#2D2D2D]'
            : 'bg-[#F3EFE6] border-[#2D2D2D]/30 hover:border-[#2D2D2D]'
        }`}
      >
        <button
          type="button"
          onClick={handleClickMain}
          className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0"
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              isConnected
                ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D]'
                : 'bg-white text-[#2D2D2D] border-[#2D2D2D]/30'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-serif font-bold text-xs text-[#2D2D2D] truncate">
                {isConnected && roastResult
                  ? roastResult.summaryBadge
                  : '連接行事曆 (解鎖今日專屬吐槽)'}
              </span>
              {!isPro && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-600/30 text-[9px] font-sans font-black tracking-wider shrink-0 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  <span>PRO 專屬</span>
                </span>
              )}
            </div>
            <p className="text-[10px] font-sans text-[#6E6A63] truncate">
              {isConnected
                ? '已即時掃描會議時段・點擊更換測試行程'
                : '智能辨識會議數量與週五末班會，自動生成精準毒舌'}
            </p>
          </div>
        </button>

        {isPro && isConnected && (
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="p-1.5 rounded-xl hover:bg-[#2D2D2D]/10 text-[#2D2D2D] cursor-pointer shrink-0 ml-1"
            title="切換模擬行事曆會議情境"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Preset Meeting Loaders Dropdown (For Testing & Immediate Live Demonstration) */}
      {showPresets && isPro && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl bg-[#FAF7F0] border-2 border-[#2D2D2D] shadow-xl p-2.5 space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-[#2D2D2D]/15 text-[11px] font-sans font-bold text-[#6E6A63]">
            <span>切換測試會議情境 (即時開酸)</span>
            <span className="text-[10px]">Client-side</span>
          </div>

          {MOCK_CALENDAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectPreset(p.events);
                setShowPresets(false);
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-[#F3EFE6] transition cursor-pointer flex flex-col"
            >
              <span className="font-serif font-bold text-xs text-[#2D2D2D]">
                {p.label}
              </span>
              <span className="text-[10px] font-sans text-[#6E6A63] mt-0.5">
                {p.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
