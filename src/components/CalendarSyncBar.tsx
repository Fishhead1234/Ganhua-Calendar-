import React from 'react';
import { Calendar, Settings2, Lock } from 'lucide-react';
import { CalendarRoastResult } from '../services/calendarRoastService';

interface CalendarSyncBarProps {
  isPro: boolean;
  isConnected: boolean;
  roastResult: CalendarRoastResult | null;
  onOpenSyncModal: () => void;
  onOpenPaywall: () => void;
}

export const CalendarSyncBar: React.FC<CalendarSyncBarProps> = ({
  isPro,
  isConnected,
  roastResult,
  onOpenSyncModal,
  onOpenPaywall,
}) => {
  const handleClick = () => {
    if (!isPro) {
      onOpenPaywall();
      return;
    }
    onOpenSyncModal();
  };

  return (
    <div className="w-full max-w-[390px] mx-auto relative select-none">
      <div
        className={`rounded-2xl border-2 transition-all p-2.5 flex items-center justify-between shadow-sm cursor-pointer ${
          isConnected
            ? 'bg-[#FAF7F0] border-[#2D2D2D]'
            : 'bg-[#F3EFE6] border-[#2D2D2D]/30 hover:border-[#2D2D2D]'
        }`}
        onClick={handleClick}
      >
        <div className="flex-1 flex items-center gap-2.5 text-left min-w-0">
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
                ? '已即時掃描會議・點擊管理 iCal 訂閱或切換情境'
                : '支援 Google / Outlook / Apple 訂閱網址，即時精準開酸'}
            </p>
          </div>
        </div>

        {isPro && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSyncModal();
            }}
            className="p-1.5 rounded-xl hover:bg-[#2D2D2D]/10 text-[#2D2D2D] cursor-pointer shrink-0 ml-1"
            title="開啟行事曆設定"
          >
            <Settings2 className="w-4 h-4 text-[#6E6A63] hover:text-[#2D2D2D]" />
          </button>
        )}
      </div>
    </div>
  );
};


