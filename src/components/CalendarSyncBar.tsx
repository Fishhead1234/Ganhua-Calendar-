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
    <div className="w-full max-w-[420px] mx-auto select-none space-y-1.5">
      {/* Live Schedule Summary Badge (When Sync/Roast is Active) */}
      {isConnected && roastResult && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#2D2D2D] text-[#FAF7F0] text-[11px] font-sans font-bold shadow-xs border border-[#2D2D2D] animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D4B483] shrink-0 animate-pulse" />
            <span className="truncate">{roastResult.summaryBadge}</span>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className="shrink-0 px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-[#FAF7F0] text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
            title="暫停行事曆吐槽，切回常規 365 幹話"
          >
            <RotateCcw className="w-3 h-3 text-[#D4B483]" />
            <span>切回常規日曆</span>
          </button>
        </div>
      )}

      {/* Main Connection Bar */}
      <div
        className={`rounded-2xl border-2 transition-all p-2.5 flex items-center justify-between shadow-xs cursor-pointer ${
          isConnected
            ? 'bg-[#FAF7F0] border-[#2D2D2D]'
            : 'bg-[#F3EFE6] border-[#2D2D2D]/25 hover:border-[#2D2D2D]'
        }`}
        onClick={handleBarClick}
      >
        <div className="flex-1 flex items-center gap-2.5 text-left min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              isConnected
                ? 'bg-[#C83E31] text-[#FAF7F0] border-[#2D2D2D]'
                : 'bg-white text-[#2D2D2D] border-[#2D2D2D]/30'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-serif font-black text-xs text-[#2D2D2D] truncate">
                {isConnected && roastResult
                  ? `已連動行事曆吐槽 (${roastResult.meetingsCount} 場會議)`
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
                ? '點擊管理 iCal / Google 授權或切換 5 大情境模擬器'
                : '支援 Google / Outlook / Apple 訂閱網址與 5 大情境模擬'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 ml-1 shrink-0">
          {isPro && onToggleConnected && (
            <button
              type="button"
              onClick={handleToggle}
              className={`p-1 rounded-lg transition cursor-pointer flex items-center ${
                isConnected
                  ? 'text-emerald-700 hover:text-emerald-800'
                  : 'text-[#6E6A63] hover:text-[#2D2D2D]'
              }`}
              title={isConnected ? '暫停吐槽・切回常規日曆' : '開啟行事曆吐槽'}
            >
              {isConnected ? (
                <ToggleRight className="w-6 h-6 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-[#6E6A63]" />
              )}
            </button>
          )}

          {isPro && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSyncModal();
              }}
              className="p-1.5 rounded-xl hover:bg-[#2D2D2D]/10 text-[#2D2D2D] cursor-pointer"
              title="開啟行事曆連動設定"
            >
              <Settings2 className="w-4 h-4 text-[#6E6A63] hover:text-[#2D2D2D]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
