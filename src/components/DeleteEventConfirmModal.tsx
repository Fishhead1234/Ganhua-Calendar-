import React from 'react';
import { Trash2, EyeOff, AlertTriangle, X, Calendar } from 'lucide-react';
import { CalendarMeeting } from '../services/calendarService';

interface DeleteEventConfirmModalProps {
  event: CalendarMeeting | null;
  isLocalCustom: boolean;
  onClose: () => void;
  onHideInApp: (event: CalendarMeeting) => void;
  onDeleteFromGoogle: (event: CalendarMeeting) => void;
  onDeleteLocal: (event: CalendarMeeting) => void;
}

export const DeleteEventConfirmModal: React.FC<DeleteEventConfirmModalProps> = ({
  event,
  isLocalCustom,
  onClose,
  onHideInApp,
  onDeleteFromGoogle,
  onDeleteLocal,
}) => {
  if (!event) return null;

  const isWritableSynced =
    !isLocalCustom &&
    event.source === 'synced' &&
    event.isReadOnly === false &&
    typeof event.eventId === 'number' &&
    event.eventId > 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#FAF7F0] rounded-[24px] border-2 border-[#2D2D2D] shadow-[0_20px_40px_rgba(45,45,45,0.25),0_6px_0_#2D2D2D] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#2D2D2D] text-[#FAF7F0] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#E58C8A]" />
            <h3 className="font-serif font-bold text-sm tracking-wide">
              {isLocalCustom ? '刪除自訂行程' : isWritableSynced ? '刪除同步行事曆行程' : '隱藏唯讀日曆行程'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-[#F3EFE6] border border-[#2D2D2D]/15 rounded-xl p-3">
            <div className="font-sans font-bold text-sm text-[#2D2D2D] truncate">
              {event.title}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6E6A63] font-sans">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>
                {event.dateKey || ''}
                {event.calendarName ? ` · ${event.calendarName}` : ''}
              </span>
            </div>
          </div>

          {isLocalCustom ? (
            <p className="text-xs font-sans text-[#4A463F] leading-relaxed">
              確定要永久刪除「<span className="font-bold text-[#2D2D2D]">{event.title}</span>」嗎？刪除後將同步取消相關提醒通知。
            </p>
          ) : isWritableSynced ? (
            <div className="space-y-2">
              <p className="text-xs font-sans text-[#4A463F] leading-relaxed">
                此行程來自可寫入的手機 / Google 行事曆，請選擇處理方式：
              </p>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] font-sans text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>若選擇「同步從 Google 行事曆刪除」，手機與雲端 Google 日曆中的該行程（含重複行程本體）也會一併移除。</span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 bg-[#F5EFE6] border border-[#D4B483] rounded-xl p-3 text-xs font-sans text-[#5A4228] leading-relaxed">
              <EyeOff className="w-4 h-4 shrink-0 mt-0.5 text-[#8C6239]" />
              <span>此為訂閱的唯讀日曆，僅可於幹話日曆中隱藏</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            {isLocalCustom ? (
              <button
                type="button"
                onClick={() => onDeleteLocal(event)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#C83E31] hover:bg-[#b03428] text-white font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>確定刪除</span>
              </button>
            ) : isWritableSynced ? (
              <>
                <button
                  type="button"
                  onClick={() => onHideInApp(event)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2D2D2D] hover:bg-[#1a1a1a] text-[#FAF7F0] font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 text-[#D4B483]" />
                  <span>僅在幹話日曆隱藏</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFromGoogle(event)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C83E31] hover:bg-[#b03428] text-white font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>同步從 Google 行事曆刪除</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onHideInApp(event)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2D2D2D] hover:bg-[#1a1a1a] text-[#FAF7F0] font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5 text-[#D4B483]" />
                <span>僅在幹話日曆隱藏</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-[#2D2D2D]/5 text-[#6E6A63] font-sans font-bold text-xs transition cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
