import React from 'react';
import { Calendar, Settings2, Lock, ToggleLeft, ToggleRight, Sparkles, RotateCcw } from 'lucide-react';
import { CalendarRoastResult } from '../services/calendarService';

interface CalendarSyncBarProps {
  isPro: boolean;
  isConnected: boolean;
  roastResult: CalendarRoastResult | null;
  onOpenSyncModal: () => void;
  onOpenPaywall: () => void;
  onToggleConnected?: (connected: boolean) => void;
}

export const CalendarSyncBar: React.FC<CalendarSyncBarProps> = ({
  isPro,
  isConnected,
  roastResult,
  onOpenSyncModal,
  onOpenPaywall,
  onToggleConnected,
}) => {
  const handleBarClick = () => {
    if (!isPro) {
      onOpenPaywall();
      return;
    }
    onOpenSyncModal();
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPro) {
      onOpenPaywall();
      return;
    }
    if (onToggleConnected) {
      onToggleConnected(!isConnected);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto select-none">
      {/* Single Unified Compact Status Bar */}
      {isConnected && roastResult ? (
        <div
          onClick={handleBarClick}
          className="rounded-xl border border-[#2D2D2D] bg-[#2D2D2D] text-[#FAF7F0] p-2 px-3 flex items-center justify-between shadow-xs cursor-pointer transition hover:bg-[#383838] active:scale-[0.99]"
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D4B483] shrink-0 animate-pulse" />
            <span className="font-sans font-bold text-xs truncate">
              {roastResult.summaryBadge}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggle}
              className="px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-[#FAF7F0] text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="暫停行事曆吐槽，切回常規 365 幹話"
            >
              <RotateCcw className="w-3 h-3 text-[#D4B483]" />
              <span>切回常規日曆</span>
            </button>
            <Settings2 className="w-3.5 h-3.5 text-[#D4B483] ml-0.5" />
          </div>
        </div>
      ) : (
        <div
          onClick={handleBarClick}
          className="rounded-xl border-2 border-[#2D2D2D]/25 hover:border-[#2D2D2D] bg-[#FAF7F0] p-2 px-3 flex items-center justify-between shadow-xs cursor-pointer transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-5 h-5 rounded-md bg-[#2D2D2D] text-[#FAF7F0] flex items-center justify-center shrink-0">
              <Calendar className="w-3 h-3" />
            </div>
            <span className="font-serif font-black text-xs text-[#2D2D2D] truncate">
              連動行事曆（解鎖今日專屬吐槽）
            </span>
            {!isPro && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-600/30 text-[9px] font-sans font-black tracking-wider shrink-0 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>PRO</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-sans font-bold text-[#6E6A63] hover:text-[#2D2D2D] shrink-0">
            <span>設定連動</span>
            <Settings2 className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );
};
