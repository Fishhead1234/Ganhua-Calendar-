import React, { useState } from 'react';
import { X, Check, Sparkles, ShieldCheck, RefreshCw, Zap } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../services/purchaseService';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (plan: SubscriptionPlan) => Promise<{ success: boolean; message: string }>;
  onRestore: () => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  isPro: boolean;
  onToggleMockPro: () => void;
  isFreeTrialActive?: boolean;
  trialDaysRemaining?: number;
  trialDaysTotal?: number;
  isPaidPro?: boolean;
  onRestoreWithCode?: (code: string) => Promise<{ success: boolean; message: string }>;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onPurchase,
  onRestore,
  isLoading,
  isPro,
  onToggleMockPro,
  isFreeTrialActive = false,
  trialDaysRemaining = 0,
  trialDaysTotal = 15,
  isPaidPro = false,
  onRestoreWithCode,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [vipCode, setVipCode] = useState('');

  if (!isOpen) return null;

  const handleBuy = async () => {
    const res = await onPurchase(selectedPlan);
    setFeedbackMsg(res.message);
    if (res.success) {
      setTimeout(() => {
        onClose();
        setFeedbackMsg(null);
      }, 1400);
    }
  };

  const handleRestoreClick = async () => {
    const res = await onRestore();
    setFeedbackMsg(res.message);
    if (res.success) {
      setTimeout(() => {
        onClose();
        setFeedbackMsg(null);
      }, 1400);
    }
  };

  const handleRedeemVip = async () => {
    if (!vipCode.trim()) return;
    if (onRestoreWithCode) {
      const res = await onRestoreWithCode(vipCode.trim());
      setFeedbackMsg(res.message);
      if (res.success) {
        setTimeout(() => {
          onClose();
          setFeedbackMsg(null);
        }, 1400);
      }
    } else {
      setFeedbackMsg('未支援兌換碼輸入');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-[32px] bg-[#F9F6F0] paper-texture border-[3px] border-[#2D2D2D] shadow-[0_20px_40px_rgba(45,45,45,0.25)] overflow-hidden my-auto relative">
        {/* Vintage Top Binding Bar */}
        <div className="px-5 py-3 bg-[#2D2D2D] text-[#F9F6F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#D4B483] border border-white/30" />
            <span className="font-serif font-black text-xs sm:text-sm tracking-widest text-[#D4B483]">
              GAN-HUA PRO • 社畜終極逃生包
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-[#F9F6F0]/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C83E31]/10 text-[#C83E31] border border-[#C83E31]/30 text-xs font-sans font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>解鎖全宇宙最強社畜精神救贖</span>
            </div>

            <h2 className="font-serif font-black text-2xl text-[#2D2D2D] tracking-tight">
              升級解鎖【社畜終極逃生包】
            </h2>
            <p className="text-xs font-sans text-[#6E6A63] leading-relaxed">
              讓行事曆每一場鳥會，都變成會心一笑的幹話。
            </p>
          </div>

          {/* Free Welcome Trial Banner */}
          {isFreeTrialActive && !isPaidPro && (
            <div className="rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 p-3.5 text-amber-900 flex items-start gap-3 animate-in fade-in">
              <span className="text-2xl shrink-0 mt-0.5">🎁</span>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-950">新手 {trialDaysTotal} 天免綁卡體驗中</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-950 font-mono font-bold text-[11px]">
                    剩餘 {trialDaysRemaining} 天
                  </span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  體驗期間已為您全數開放 Pro 特權！若喜歡幹話日曆，歡迎提前贊助解鎖終身或年度方案支持我們。
                </p>
              </div>
            </div>
          )}

          {/* Feature Checklist */}
          <div className="rounded-2xl bg-[#F3EFE6] border border-[#2D2D2D]/20 p-4 space-y-2.5">
            {[
              {
                title: '行事曆智能聯動',
                desc: '根據會議數量與週五時段即時開酸，生成專屬吐槽',
              },
              {
                title: '解鎖全角色陣容',
                desc: '永久暢享「擺爛水豚」+「下班幽靈」及未來限定角色',
              },
              {
                title: '完整歷史回顧',
                desc: '解鎖無限往日歸檔，翻閱過去所有苟延殘喘的生還日',
              },
              {
                title: '高清無浮水印 IG 限動',
                desc: '導出乾淨高質感 9:16 限動美圖，不留任何浮水印',
              },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#2D2D2D] text-[#F9F6F0] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#D4B483]" />
                </div>
                <div>
                  <div className="font-serif font-black text-xs text-[#2D2D2D]">
                    {f.title}
                  </div>
                  <div className="text-[11px] font-sans text-[#6E6A63]">
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Cards */}
          <div className="space-y-2.5">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const active = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center justify-between relative ${
                    active
                      ? 'border-[#2D2D2D] bg-[#FAF7F0] shadow-[0_4px_0_#2D2D2D]'
                      : 'border-[#2D2D2D]/20 bg-[#FAF7F0]/60 hover:border-[#2D2D2D]/50'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-black text-sm text-[#2D2D2D]">
                        {plan.title}
                      </span>
                      {plan.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#C83E31] text-white text-[10px] font-sans font-bold">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-sans text-[#6E6A63]">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-base text-[#2D2D2D]">
                      {plan.priceFormatted}
                    </div>
                    <div className="text-[10px] font-sans text-[#6E6A63]">
                      {plan.usdFormatted}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback Message */}
          {feedbackMsg && (
            <div className="p-2.5 rounded-xl bg-[#2D2D2D] text-[#F9F6F0] text-xs font-sans font-bold text-center animate-in fade-in">
              {feedbackMsg}
            </div>
          )}

          {/* CTA Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleBuy}
            className="w-full py-4 px-5 rounded-2xl bg-[#2D2D2D] hover:bg-[#1a1a1a] text-[#FAF7F0] font-serif font-black text-base tracking-wider shadow-[0_5px_0_#C83E31] active:translate-y-0.5 active:shadow-[0_2px_0_#C83E31] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-[#D4B483] fill-[#D4B483]" />
            <span>{isLoading ? '處理中...' : '立即升級，笑看人生'}</span>
          </button>

          {/* Footer Actions: Restore Purchases + Web Mock Toggle */}
          <div className="pt-1 flex items-center justify-between text-xs font-sans text-[#6E6A63] border-t border-[#2D2D2D]/15">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleRestoreClick}
              className="hover:text-[#2D2D2D] hover:underline cursor-pointer"
            >
              恢復購買 (Restore Purchases)
            </button>

            {/* Test Simulation Switch for Browser Mode */}
            <button
              type="button"
              onClick={onToggleMockPro}
              className="text-[11px] font-mono px-2 py-0.5 rounded border border-[#2D2D2D]/20 hover:bg-[#2D2D2D]/5 text-[#2D2D2D] cursor-pointer"
              title="點擊模擬切換 Free 與 Pro 專業版狀態，方便測試所有功能閘道"
            >
              {isPro ? '🧪 測試：已啟用 PRO' : '🧪 測試：切換 PRO 狀態'}
            </button>
          </div>

          {/* Universal Reviewer / VIP Code Redeem */}
          <div className="pt-2 text-center">
            {!showCodeInput ? (
              <button
                type="button"
                onClick={() => setShowCodeInput(true)}
                className="text-[11px] font-sans text-[#6E6A63] hover:text-[#2D2D2D] hover:underline cursor-pointer"
              >
                審查員 / VIP 專屬兌換碼 (Redeem VIP Code)
              </button>
            ) : (
              <div className="flex items-center gap-2 max-w-xs mx-auto">
                <input
                  type="text"
                  value={vipCode}
                  onChange={(e) => setVipCode(e.target.value)}
                  placeholder="輸入 PLAY-VIP-2026"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#2D2D2D]/30 bg-white text-xs font-mono uppercase"
                />
                <button
                  type="button"
                  disabled={isLoading || !vipCode.trim()}
                  onClick={handleRedeemVip}
                  className="px-3 py-1.5 rounded-xl bg-[#2D2D2D] text-white text-xs font-bold cursor-pointer hover:bg-[#3D3D3D] disabled:opacity-50"
                >
                  兌換
                </button>
                <button
                  type="button"
                  onClick={() => setShowCodeInput(false)}
                  className="text-xs text-[#6E6A63] hover:text-[#2D2D2D]"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

