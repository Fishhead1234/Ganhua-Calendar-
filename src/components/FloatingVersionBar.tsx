import React, { useState } from 'react';
import { Shield, Crown, User, Settings2, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { AppTier } from '../services/purchaseService';

interface FloatingVersionBarProps {
  currentTier: AppTier;
  isAdminAuthed: boolean;
  onChangeTier: (tier: AppTier) => void;
  onOpenAdminConsole: () => void;
  onRequestPasswordAuth: () => void;
}

export const FloatingVersionBar: React.FC<FloatingVersionBarProps> = ({
  currentTier,
  isAdminAuthed,
  onChangeTier,
  onOpenAdminConsole,
  onRequestPasswordAuth,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // If not authenticated as Admin, only show a subtle discrete keyhole entrance
  if (!isAdminAuthed) {
    return (
      <div className="fixed bottom-3 left-3 z-40 select-none">
        <button
          type="button"
          onClick={onRequestPasswordAuth}
          className="p-2 rounded-full bg-[#2D2D2D]/40 hover:bg-[#2D2D2D] text-[#D4B483] border border-[#2D2D2D]/20 hover:border-[#D4B483]/50 transition cursor-pointer opacity-25 hover:opacity-100 shadow-sm"
          title="內部管理員通道"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 sm:left-4 z-40 select-none">
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2D2D2D] text-[#F9F6F0] text-xs font-sans font-bold shadow-xl border border-[#D4B483]/50 hover:bg-[#1a1a1a] transition cursor-pointer"
          title="展開版本視角切換器"
        >
          <Shield className="w-3.5 h-3.5 text-[#D4B483]" />
          <span>
            {currentTier === 'admin'
              ? '👑 管理員模式'
              : currentTier === 'pro'
              ? 'PRO 專業版'
              : '免費版視角'}
          </span>
          <ChevronUp className="w-3 h-3 text-[#D4B483]" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#2D2D2D]/95 backdrop-blur-md text-[#F9F6F0] border-2 border-[#D4B483]/60 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="px-2 py-1 text-[11px] font-sans font-black text-[#D4B483] flex items-center gap-1">
            <span>👁️ 視角:</span>
          </div>

          <button
            type="button"
            onClick={() => onChangeTier('free')}
            className={`px-2.5 py-1 rounded-xl text-xs font-sans font-bold transition cursor-pointer flex items-center gap-1 ${
              currentTier === 'free'
                ? 'bg-[#C83E31] text-white shadow-sm'
                : 'text-[#F9F6F0]/70 hover:text-white hover:bg-white/10'
            }`}
            title="以免費體驗版視角瀏覽（水豚/幽靈鎖定、7天存檔、浮水印）"
          >
            <User className="w-3 h-3" />
            <span>免費版</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTier('pro')}
            className={`px-2.5 py-1 rounded-xl text-xs font-sans font-bold transition cursor-pointer flex items-center gap-1 ${
              currentTier === 'pro'
                ? 'bg-[#D4B483] text-[#2D2D2D] font-black shadow-sm'
                : 'text-[#F9F6F0]/70 hover:text-white hover:bg-white/10'
            }`}
            title="以付費 PRO 版視角瀏覽（解鎖全部角色、無限歷史、無浮水印）"
          >
            <Crown className="w-3 h-3 fill-current" />
            <span>PRO 版</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTier('admin')}
            className={`px-2.5 py-1 rounded-xl text-xs font-sans font-bold transition cursor-pointer flex items-center gap-1 ${
              currentTier === 'admin'
                ? 'bg-amber-500 text-[#2D2D2D] font-black shadow-sm'
                : 'text-[#F9F6F0]/70 hover:text-white hover:bg-white/10'
            }`}
            title="切換為全權限管理員（解鎖全部功能與時光機跳轉）"
          >
            <Shield className="w-3 h-3 text-[#2D2D2D]" />
            <span>管理員</span>
          </button>

          <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

          <button
            type="button"
            onClick={onOpenAdminConsole}
            className="p-1.5 rounded-xl hover:bg-white/10 text-[#D4B483] transition cursor-pointer"
            title="開啟管理員控制台 (時光機、毒舌情境注入、打卡模擬)"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-xl hover:bg-white/10 text-white/50 transition cursor-pointer"
            title="收合"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};


