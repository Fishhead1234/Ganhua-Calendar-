import React, { useState } from 'react';
import {
  X,
  Shield,
  Crown,
  User,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Zap,
  RotateCcw,
  Eye,
  Check,
  Lock,
  Unlock,
  Flame,
  Stamp,
  Share2,
} from 'lucide-react';
import { AppTier } from '../services/purchaseService';
import {
  CalendarMeeting,
  MOCK_CALENDAR_PRESETS,
} from '../services/calendarRoastService';

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: AppTier;
  onChangeTier: (tier: AppTier) => void;
  dateOffset: number;
  onSetDateOffset: (offset: number) => void;
  allowFutureDates: boolean;
  onToggleAllowFutureDates: (allow: boolean) => void;
  streakCount: number;
  onSetStreakCount: (count: number) => void;
  isTodaySurvived: boolean;
  onToggleTodaySurvived: () => void;
  onSelectMeetingPreset: (meetings: CalendarMeeting[]) => void;
  onOpenPaywall: () => void;
  onOpenIgModal: () => void;
  onResetApp: () => void;
}

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onChangeTier,
  dateOffset,
  onSetDateOffset,
  allowFutureDates,
  onToggleAllowFutureDates,
  streakCount,
  onSetStreakCount,
  isTodaySurvived,
  onToggleTodaySurvived,
  onSelectMeetingPreset,
  onOpenPaywall,
  onOpenIgModal,
  onResetApp,
}) => {
  const [customDateStr, setCustomDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  // Calculate simulated date based on dateOffset
  const simulatedDate = new Date();
  simulatedDate.setDate(simulatedDate.getDate() + dateOffset);
  const simulatedDateStr = simulatedDate.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDateStr(val);
    if (!val) return;
    const chosen = new Date(val + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((chosen.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    onSetDateOffset(diffDays);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[28px] paper-texture border-2 border-[#2D2D2D] bg-[#F9F6F0] p-5 sm:p-7 shadow-[0_12px_0_#2D2D2D] flex flex-col gap-6 text-[#2D2D2D]">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-[#2D2D2D]/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D2D2D] text-[#F9F6F0] flex items-center justify-center border-2 border-[#D4B483] shadow-md">
              <Shield className="w-5 h-5 text-[#D4B483]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-black text-xl sm:text-2xl tracking-tight text-[#2D2D2D]">
                  管理員控制台 & 版本切換器
                </h2>
                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#D4B483] text-[#2D2D2D] border border-[#2D2D2D]">
                  ADMIN
                </span>
              </div>
              <p className="text-xs font-sans text-[#6E6A63]">
                即時切換使用者版本視角，預覽不同權限下的產品樣貌與核心功能
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full border border-[#2D2D2D]/20 hover:bg-[#2D2D2D]/10 transition text-[#2D2D2D] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Version Switcher (Persona) */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Eye className="w-4 h-4 text-[#C83E31]" />
            <h3 className="font-serif font-bold text-sm tracking-wide text-[#2D2D2D]">
              1. 體驗各版本樣貌 (即時切換視角)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Free Tier Card */}
            <div
              onClick={() => onChangeTier('free')}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                currentTier === 'free'
                  ? 'bg-white border-[#C83E31] shadow-[0_4px_0_#C83E31]'
                  : 'bg-[#FAF7F0] border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-serif font-black text-sm text-[#2D2D2D] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#6E6A63]" />
                    免費體驗版
                  </span>
                  {currentTier === 'free' && (
                    <span className="text-[10px] font-bold bg-[#C83E31] text-white px-1.5 py-0.5 rounded-full">
                      當前視角
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-sans text-[#6E6A63] leading-relaxed">
                  一般非付費用戶視角。僅開放社畜貓、過往歷史限制 7 天、行事曆開酸鎖定、IG 限動導出含浮水印。
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#2D2D2D]/10 flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#6E6A63]">免費 $0</span>
                <span className={currentTier === 'free' ? 'text-[#C83E31]' : 'text-[#2D2D2D]'}>
                  {currentTier === 'free' ? '✓ 使用中' : '切換為此視角'}
                </span>
              </div>
            </div>

            {/* Pro Tier Card */}
            <div
              onClick={() => onChangeTier('pro')}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                currentTier === 'pro'
                  ? 'bg-white border-[#D4B483] shadow-[0_4px_0_#D4B483]'
                  : 'bg-[#FAF7F0] border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-serif font-black text-sm text-[#2D2D2D] flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-600 fill-amber-600" />
                    PRO 專業版
                  </span>
                  {currentTier === 'pro' && (
                    <span className="text-[10px] font-bold bg-[#D4B483] text-[#2D2D2D] px-1.5 py-0.5 rounded-full">
                      當前視角
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-sans text-[#6E6A63] leading-relaxed">
                  付費會員視角 (年費/終身)。解鎖水豚與下班幽靈、無限歷史存檔、行事曆動態開酸、無浮水印導出。
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#2D2D2D]/10 flex items-center justify-between text-[11px] font-bold">
                <span className="text-amber-800">NT$99/年 • NT$190終身</span>
                <span className={currentTier === 'pro' ? 'text-amber-700' : 'text-[#2D2D2D]'}>
                  {currentTier === 'pro' ? '✓ 使用中' : '切換為此視角'}
                </span>
              </div>
            </div>

            {/* Admin Superuser Card */}
            <div
              onClick={() => onChangeTier('admin')}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                currentTier === 'admin'
                  ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#D4B483] shadow-[0_4px_0_#D4B483]'
                  : 'bg-[#FAF7F0] border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-serif font-black text-sm flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#D4B483]" />
                    👑 管理員 (Admin)
                  </span>
                  {currentTier === 'admin' && (
                    <span className="text-[10px] font-bold bg-[#D4B483] text-[#2D2D2D] px-1.5 py-0.5 rounded-full">
                      超級管理員
                    </span>
                  )}
                </div>
                <p className={`text-[11px] font-sans leading-relaxed ${currentTier === 'admin' ? 'text-[#F9F6F0]/80' : 'text-[#6E6A63]'}`}>
                  擁有最高權限。PRO 功能全開，解鎖下方時光機日期跳轉、解除未來日期鎖定、模擬會議毒舌。
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#D4B483]">最高權限</span>
                <span className={currentTier === 'admin' ? 'text-[#D4B483]' : 'text-[#2D2D2D]'}>
                  {currentTier === 'admin' ? '✓ 啟用中' : '啟用管理員'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Time Machine (Date Jumper & Future Lock Bypass) */}
        <div className="p-4 rounded-2xl bg-white border border-[#2D2D2D]/20 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4B483]" />
              <h3 className="font-serif font-bold text-sm tracking-wide text-[#2D2D2D]">
                2. 時光機 (365 天日曆跳轉 & 未來解鎖)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#6E6A63]">
              當前模擬：{simulatedDateStr} ({dateOffset === 0 ? '今日' : dateOffset > 0 ? `未來 +${dateOffset} 天` : `過往 ${dateOffset} 天`})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="date"
              value={customDateStr}
              onChange={handleCustomDateChange}
              className="px-3 py-1.5 rounded-xl border border-[#2D2D2D]/30 bg-[#FAF7F0] font-mono text-xs font-bold text-[#2D2D2D] cursor-pointer"
            />

            <button
              type="button"
              onClick={() => onSetDateOffset(0)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-sans font-bold cursor-pointer transition ${
                dateOffset === 0
                  ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D]'
                  : 'bg-[#FAF7F0] text-[#2D2D2D] border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
              }`}
            >
              回到今天 (Today)
            </button>

            <button
              type="button"
              onClick={() => onSetDateOffset(dateOffset - 1)}
              className="px-2.5 py-1.5 rounded-xl border border-[#2D2D2D]/20 bg-[#FAF7F0] hover:border-[#2D2D2D] text-xs font-sans font-bold text-[#2D2D2D] cursor-pointer"
            >
              前一日 (-1)
            </button>

            <button
              type="button"
              onClick={() => onSetDateOffset(dateOffset + 1)}
              className="px-2.5 py-1.5 rounded-xl border border-[#2D2D2D]/20 bg-[#FAF7F0] hover:border-[#2D2D2D] text-xs font-sans font-bold text-[#2D2D2D] cursor-pointer"
            >
              後一日 (+1)
            </button>

            <button
              type="button"
              onClick={() => onSetDateOffset(-30)}
              className="px-2.5 py-1.5 rounded-xl border border-[#2D2D2D]/20 bg-[#FAF7F0] hover:border-[#2D2D2D] text-xs font-sans font-bold text-[#2D2D2D] cursor-pointer"
            >
              30天前 (-30)
            </button>
          </div>

          {/* Toggle: Unlock Tomorrow / Future Navigation */}
          <div className="pt-2 border-t border-[#2D2D2D]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {allowFutureDates ? (
                <Unlock className="w-4 h-4 text-emerald-600" />
              ) : (
                <Lock className="w-4 h-4 text-[#C83E31]" />
              )}
              <span className="text-xs font-sans font-bold text-[#2D2D2D]">
                解除未來日期撕頁鎖定 (可撕下今天提前查看明天與後續日曆)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onToggleAllowFutureDates(!allowFutureDates)}
              className={`px-3 py-1 rounded-full text-xs font-sans font-black transition cursor-pointer ${
                allowFutureDates
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#FAF7F0] text-[#6E6A63] border border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
              }`}
            >
              {allowFutureDates ? '已解鎖 (自由翻閱)' : '鎖定中 (常規規則)'}
            </button>
          </div>
        </div>

        {/* Section 3: Calendar Roast Scenario Injector */}
        <div className="p-4 rounded-2xl bg-white border border-[#2D2D2D]/20 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <h3 className="font-serif font-bold text-sm tracking-wide text-[#2D2D2D]">
              3. 行事曆開酸模擬 (1 鍵注入情境)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOCK_CALENDAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectMeetingPreset(preset.events)}
                className="p-2.5 rounded-xl border border-[#2D2D2D]/20 hover:border-[#2D2D2D] bg-[#FAF7F0] hover:bg-[#D4B483]/20 transition text-left cursor-pointer flex flex-col justify-between"
              >
                <span className="font-serif font-bold text-xs text-[#2D2D2D]">
                  {preset.label}
                </span>
                <span className="text-[10px] font-sans text-[#6E6A63] mt-1">
                  {preset.events.length} 場會議
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Survival Streak & Stamp Simulator */}
        <div className="p-4 rounded-2xl bg-white border border-[#2D2D2D]/20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#C83E31]" />
              <h3 className="font-serif font-bold text-sm tracking-wide text-[#2D2D2D]">
                4. 平安打卡生還天數模擬
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleTodaySurvived}
                className={`px-2.5 py-1 rounded-xl text-xs font-sans font-bold border transition cursor-pointer flex items-center gap-1 ${
                  isTodaySurvived
                    ? 'bg-[#C83E31] text-white border-[#C83E31]'
                    : 'bg-[#FAF7F0] text-[#2D2D2D] border-[#2D2D2D]/20'
                }`}
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>{isTodaySurvived ? '今日已蓋生還章' : '今日未蓋章'}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-sans text-[#6E6A63]">快速設定連續天數：</span>
            {[0, 3, 7, 30, 100, 365].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onSetStreakCount(count)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-sans font-bold cursor-pointer transition ${
                  streakCount === count
                    ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D]'
                    : 'bg-[#FAF7F0] text-[#2D2D2D] border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
                }`}
              >
                {count} 天
              </button>
            ))}
          </div>
        </div>

        {/* Section 5: Modal & View Testers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2D2D2D]/15">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPaywall}
              className="px-3 py-2 rounded-xl border border-[#2D2D2D] bg-[#FAF7F0] hover:bg-[#D4B483]/30 text-xs font-sans font-bold text-[#2D2D2D] cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Crown className="w-3.5 h-3.5 text-amber-700" />
              <span>預覽付費牆 (Paywall Modal)</span>
            </button>

            <button
              type="button"
              onClick={onOpenIgModal}
              className="px-3 py-2 rounded-xl border border-[#2D2D2D] bg-[#FAF7F0] hover:bg-[#EAE3D5] text-xs font-sans font-bold text-[#2D2D2D] cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-[#2D2D2D]" />
              <span>預覽 IG 限動導出 (Story Modal)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetApp}
            className="px-3 py-2 rounded-xl border border-[#C83E31]/30 hover:border-[#C83E31] bg-[#C83E31]/10 text-xs font-sans font-bold text-[#C83E31] cursor-pointer flex items-center gap-1.5"
            title="清空瀏覽器快取並還原初始狀態"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重設所有測試數據</span>
          </button>
        </div>
      </div>
    </div>
  );
};
