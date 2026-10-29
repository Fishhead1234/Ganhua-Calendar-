import React, { useState, useEffect } from 'react';
import { X, Cake, Sparkles, Check, Trash2, Calendar as CalendarIcon, Eye } from 'lucide-react';

interface BirthdayModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthday: { month: number; day: number } | null;
  onSaveBirthday: (bday: { month: number; day: number } | null) => void;
  onPreviewBirthdayQuote: (month: number, day: number) => void;
}

export const BirthdayModal: React.FC<BirthdayModalProps> = ({
  isOpen,
  onClose,
  birthday,
  onSaveBirthday,
  onPreviewBirthdayQuote,
}) => {
  const [month, setMonth] = useState<number>(() => birthday?.month || new Date().getMonth() + 1);
  const [day, setDay] = useState<number>(() => birthday?.day || new Date().getDate());

  useEffect(() => {
    if (birthday) {
      setMonth(birthday.month);
      setDay(birthday.day);
    }
  }, [birthday, isOpen]);

  if (!isOpen) return null;

  // Max days in the selected month
  const maxDays = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] || 31;

  const handleSave = () => {
    const validDay = Math.min(day, maxDays);
    onSaveBirthday({ month, day: validDay });
    onClose();
  };

  const handleClear = () => {
    onSaveBirthday(null);
    onClose();
  };

  const handlePreview = () => {
    const validDay = Math.min(day, maxDays);
    onSaveBirthday({ month, day: validDay });
    onPreviewBirthdayQuote(month, validDay);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-[26px] paper-texture border-2 border-[#2D2D2D] bg-[#F9F6F0] p-6 shadow-[0_12px_0_#2D2D2D] flex flex-col gap-5 text-[#2D2D2D]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#2D2D2D]/15 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C83E31] text-white flex items-center justify-center border-2 border-[#2D2D2D] shadow-md shrink-0">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black text-lg tracking-tight text-[#2D2D2D]">
                🎂 壽星避難日設定
              </h2>
              <p className="text-[11px] font-sans text-[#6E6A63]">
                設定你的生日，解鎖專屬生日避難特權
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

        {/* Feature Explainer Card */}
        <div className="p-3 rounded-2xl bg-[#FAF7F0] border border-[#2D2D2D]/20 text-xs font-sans leading-relaxed text-[#6E6A63] space-y-1.5">
          <p className="font-serif font-bold text-[#2D2D2D] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>生日專屬特權：</span>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            <li>到了生日當天，日曆將自動切換為【壽星避難日】卡片。</li>
            <li>專屬毒舌祝福：不回訊息、不演積極、吃整顆蛋糕。</li>
            <li>宜：早退大餐放空 / 忌：在生日這天看工作群組與加班開會。</li>
            <li>全螢幕生日慶祝彩帶與「平安又老一歲」紀念印章。</li>
          </ul>
        </div>

        {/* Month & Day Selectors */}
        <div className="space-y-2">
          <label className="block text-xs font-serif font-bold text-[#2D2D2D]">
            選擇你的國曆生日 (月份 / 日期)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-sans font-bold text-[#6E6A63] mb-1">月份</span>
              <select
                value={month}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setMonth(m);
                  const newMax = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m] || 31;
                  if (day > newMax) setDay(newMax);
                }}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#2D2D2D]/30 bg-[#FAF7F0] text-sm font-sans font-bold text-[#2D2D2D] focus:border-[#2D2D2D] focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m} 月
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-[10px] font-sans font-bold text-[#6E6A63] mb-1">日期</span>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#2D2D2D]/30 bg-[#FAF7F0] text-sm font-sans font-bold text-[#2D2D2D] focus:border-[#2D2D2D] focus:outline-none cursor-pointer"
              >
                {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d} 日
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#2D2D2D]/15">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 px-3 rounded-xl border-2 border-[#2D2D2D] bg-[#2D2D2D] hover:bg-[#1a1a1a] text-xs font-sans font-bold text-[#F9F6F0] transition active:scale-95 shadow-[0_3px_0_#6E6A63] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-[#D4B483]" />
              <span>儲存生日設定</span>
            </button>

            <button
              type="button"
              onClick={handlePreview}
              className="py-2.5 px-3 rounded-xl border border-[#2D2D2D] bg-[#FAF7F0] hover:bg-[#D4B483]/30 text-xs font-sans font-bold text-[#2D2D2D] transition cursor-pointer flex items-center gap-1 shadow-sm"
              title="立即跳轉預覽生日特權卡片"
            >
              <Eye className="w-3.5 h-3.5 text-amber-700" />
              <span>預覽卡片</span>
            </button>
          </div>

          {birthday && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full py-1.5 text-center text-xs font-sans font-bold text-[#C83E31]/80 hover:text-[#C83E31] transition cursor-pointer flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>清除生日紀錄</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
