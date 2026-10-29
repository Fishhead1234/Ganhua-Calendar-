import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onVerify: (password: string) => boolean;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onVerify,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg(null);
      setIsSuccess(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('請輸入管理員密碼');
      return;
    }

    const valid = onVerify(password);
    if (valid) {
      setIsSuccess(true);
      setErrorMsg(null);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } else {
      setErrorMsg('密碼錯誤，請重新確認');
      setPassword('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-[26px] paper-texture border-2 border-[#2D2D2D] bg-[#F9F6F0] p-6 shadow-[0_12px_0_#2D2D2D] flex flex-col gap-5 text-[#2D2D2D]">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D2D2D] text-[#D4B483] flex items-center justify-center border-2 border-[#D4B483] shadow-md shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black text-lg tracking-tight text-[#2D2D2D]">
                管理員權限驗證
              </h2>
              <p className="text-[11px] font-sans text-[#6E6A63]">
                請輸入管理員金鑰以解鎖最高權限
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full border border-[#2D2D2D]/20 hover:bg-[#2D2D2D]/10 transition text-[#2D2D2D] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-serif font-bold text-[#2D2D2D]">
              管理員密碼 (Passcode)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="請輸入管理員密碼..."
                className={`w-full px-3.5 py-2.5 rounded-xl border-2 font-mono text-sm tracking-widest bg-[#FAF7F0] text-[#2D2D2D] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#6E6A63]/50 focus:outline-none transition ${
                  errorMsg
                    ? 'border-[#C83E31] bg-[#C83E31]/5'
                    : isSuccess
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-[#2D2D2D]/30 focus:border-[#2D2D2D]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6A63] hover:text-[#2D2D2D] transition p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs font-sans font-bold text-[#C83E31] flex items-center gap-1 pt-0.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}

            {isSuccess && (
              <p className="text-xs font-sans font-bold text-emerald-600 flex items-center gap-1 pt-0.5 animate-in fade-in">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>✓ 驗證成功！正在啟動管理員控制台...</span>
              </p>
            )}
          </div>

          <div className="text-[11px] font-sans text-[#6E6A63]/80 bg-[#FAF7F0] border border-[#2D2D2D]/15 rounded-xl p-2.5 leading-relaxed">
            <span className="font-bold text-[#2D2D2D]">💡 系統提示：</span>
            預設金鑰為 <code className="bg-[#2D2D2D]/10 px-1 py-0.5 rounded font-mono font-bold text-[#2D2D2D]">ganhua2026</code> 或 <code className="bg-[#2D2D2D]/10 px-1 py-0.5 rounded font-mono font-bold text-[#2D2D2D]">8888</code>。
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-[#2D2D2D]/30 bg-[#FAF7F0] hover:bg-[#EAE3D5] text-xs font-sans font-bold text-[#2D2D2D] transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSuccess}
              className="flex-1 py-2.5 px-3 rounded-xl border-2 border-[#2D2D2D] bg-[#2D2D2D] hover:bg-[#1a1a1a] text-xs font-sans font-bold text-[#F9F6F0] transition active:scale-95 shadow-[0_3px_0_#6E6A63] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-[#D4B483]" />
              <span>驗證解鎖</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
