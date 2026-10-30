import React, { useState } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Sparkles,
  Link as LinkIcon,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Flame,
  Coffee,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  CalendarMeeting,
  CalendarRoastResult,
  MOCK_CALENDAR_PRESETS,
  analyzeCalendarEvents,
} from '../services/calendarRoastService';
import { fetchAndParseIcs } from '../services/iCalService';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  activeMeetings: CalendarMeeting[];
  onUpdateMeetings: (meetings: CalendarMeeting[]) => void;
  onToggleConnected: (connected: boolean) => void;
  isPro: boolean;
  onOpenPaywall: () => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  activeMeetings,
  onUpdateMeetings,
  onToggleConnected,
  isPro,
  onOpenPaywall,
}) => {
  const [activeTab, setActiveTab] = useState<'ical' | 'presets' | 'custom'>('ical');
  const [icalUrl, setIcalUrl] = useState(() => localStorage.getItem('ganhua_ical_url') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // New Custom Meeting Form State
  const [newTitle, setNewTitle] = useState('');
  const [newHour, setNewHour] = useState(14);
  const [newMinute, setNewMinute] = useState(0);
  const [newDuration, setNewDuration] = useState(60);

  if (!isOpen) return null;

  const currentRoast = analyzeCalendarEvents(activeMeetings);

  const handleSyncIcs = async () => {
    if (!icalUrl.trim()) {
      setErrorMsg('請先輸入或貼上 iCal / .ics 網址');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      localStorage.setItem('ganhua_ical_url', icalUrl.trim());
      const parsedMeetings = await fetchAndParseIcs(icalUrl.trim());
      onUpdateMeetings(parsedMeetings);
      onToggleConnected(true);
      setSuccessMsg(`🎉 同步成功！今日共偵測到 ${parsedMeetings.length} 場會議。`);
    } catch (err: any) {
      setErrorMsg(err.message || '同步失敗，請確認網址是否包含公開或私人 ics 權限。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (presetEvents: CalendarMeeting[]) => {
    onUpdateMeetings(presetEvents);
    onToggleConnected(true);
    setSuccessMsg('已套用會議情境');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleAddCustomMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const isFridayAfterFour = new Date().getDay() === 5 && (newHour >= 16 || (newHour === 15 && newMinute >= 45));

    const newMeeting: CalendarMeeting = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      startHour: Number(newHour),
      startMinute: Number(newMinute),
      durationMinutes: Number(newDuration),
      isFridayAfterFour,
    };

    onUpdateMeetings([...activeMeetings, newMeeting]);
    onToggleConnected(true);
    setNewTitle('');
    setSuccessMsg('會議已新增至今日清單！');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleDeleteMeeting = (id: string) => {
    onUpdateMeetings(activeMeetings.filter((m) => m.id !== id));
  };

  const handleClearAll = () => {
    onUpdateMeetings([]);
    onToggleConnected(false);
    setSuccessMsg('已清空所有會議與連動狀態');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2D2D]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#F9F6F0] rounded-[28px] border-2 border-[#2D2D2D] shadow-[0_20px_50px_rgba(45,45,45,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#FAF7F0] border-b-2 border-[#2D2D2D] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C83E31] text-[#FAF7F0] flex items-center justify-center border border-[#2D2D2D]">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-lg text-[#2D2D2D]">
                  行事曆智能吐槽連動
                </h3>
                <span className="text-[11px] font-sans font-black px-2 py-0.5 rounded-full bg-[#D4B483] text-[#2D2D2D] border border-[#2D2D2D]/30">
                  PRO 專屬
                </span>
              </div>
              <p className="text-xs font-sans text-[#6E6A63]">
                根據今日會議多寡與致命時段，為社畜量身定制專屬毒舌金句
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#2D2D2D]/10 text-[#2D2D2D] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roast Live Preview Banner */}
        <div className="bg-[#F3EFE6] px-5 py-3 border-b border-[#2D2D2D]/20 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#C83E31] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-sans font-bold text-[#2D2D2D]">
                {currentRoast.summaryBadge}
              </span>
              <span className="text-[10px] font-sans text-[#6E6A63]">
                總時長：{currentRoast.totalMeetingHours} 小時
              </span>
            </div>
            <p className="text-xs font-serif text-[#C83E31] font-bold truncate mt-0.5">
              「{currentRoast.roastQuote}」
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2D2D2D]/20 bg-[#FAF7F0] text-xs font-sans font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('ical')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeTab === 'ical'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            🔗 iCal 訂閱連結 (推薦)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeTab === 'presets'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            ⚡ 快速情境切換
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeTab === 'custom'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            ✏️ 自訂今日會議 ({activeMeetings.length})
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: iCal Subscription */}
          {activeTab === 'ical' && (
            <div className="space-y-4">
              <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#2D2D2D]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-sans font-bold text-[#2D2D2D] flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#C83E31]" />
                    <span>貼上私人 iCal / .ics 訂閱網址</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-[11px] font-sans text-[#6E6A63] hover:text-[#2D2D2D] flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>如何取得網址？</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={icalUrl}
                    onChange={(e) => setIcalUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#2D2D2D]/30 rounded-xl focus:outline-hidden focus:border-[#C83E31]"
                  />
                  <button
                    type="button"
                    onClick={handleSyncIcs}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#2D2D2D] text-[#FAF7F0] rounded-xl text-xs font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                  >
                    {isLoading ? '同步中...' : '立即同步'}
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-sans text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-2.5 rounded-xl bg-green-50 border border-green-200 text-xs font-sans text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
              </div>

              {/* Accordion Guide on how to find iCal links */}
              {showGuide && (
                <div className="bg-[#F3EFE6] p-4 rounded-2xl border border-[#2D2D2D]/20 text-xs font-sans text-[#6E6A63] space-y-2.5">
                  <div className="font-bold text-[#2D2D2D]">💡 各大行事曆「私人 iCal 網址」取得方法：</div>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
                    <li>
                      <strong className="text-[#2D2D2D]">Google 日曆</strong>：電腦開啟 Google 日曆 ➔ 齒輪「設定」 ➔ 左側點選您的日曆 ➔ 往下滾動找到「整合日曆」 ➔ 複製<span className="text-[#C83E31] font-semibold">「iCal 格式的私人地址」</span>。
                    </li>
                    <li>
                      <strong className="text-[#2D2D2D]">Outlook 365</strong>：網頁版設定 ➔ 行事曆 ➔ 共用行事曆 ➔ 發布行事曆 ➔ 複製 <span className="text-[#C83E31] font-semibold">ICS 連結</span>。
                    </li>
                    <li>
                      <strong className="text-[#2D2D2D]">Apple 日曆 / iCloud</strong>：分享日曆 ➔ 開啟公開/訂閱連結 (webcal://)。
                    </li>
                  </ul>
                  <p className="text-[11px] text-[#6E6A63]/80 italic pt-1">
                    * 註：日曆僅於您的本機設備端解析，絕不上傳伺服器，嚴格保護您的隱私。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Quick Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs font-sans text-[#6E6A63]">
                想即刻體驗不同慘狀的毒舌吐槽？點擊以下情境快速切換：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MOCK_CALENDAR_PRESETS.map((preset) => {
                  const isCurrent =
                    activeMeetings.length === preset.events.length &&
                    activeMeetings.every((m, idx) => m.title === preset.events[idx]?.title);

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.events)}
                      className={`p-3 rounded-2xl text-left border-2 transition cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#FAF7F0] border-[#C83E31] shadow-sm'
                          : 'bg-white border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
                      }`}
                    >
                      <div>
                        <div className="font-serif font-black text-sm text-[#2D2D2D]">
                          {preset.label}
                        </div>
                        <div className="text-xs font-sans text-[#6E6A63] mt-1">
                          {preset.description}
                        </div>
                      </div>
                      <div className="text-[11px] font-sans font-bold text-[#C83E31] mt-2">
                        {preset.events.length} 場會議
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Custom Today's Meetings */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              {/* Add form */}
              <form onSubmit={handleAddCustomMeeting} className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#2D2D2D]/20 space-y-3">
                <div className="font-sans font-bold text-xs text-[#2D2D2D] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#C83E31]" />
                  <span>自訂新增一場今日會議</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="會議名稱 (例: 專案進度對齊)"
                    className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-[#2D2D2D]/30 rounded-xl focus:outline-hidden"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={newHour}
                      onChange={(e) => setNewHour(Number(e.target.value))}
                      className="w-14 px-2 py-1.5 text-xs bg-white border border-[#2D2D2D]/30 rounded-xl text-center"
                      title="開始小時 (0-23)"
                    />
                    <span className="self-center text-xs font-bold">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={newMinute}
                      onChange={(e) => setNewMinute(Number(e.target.value))}
                      className="w-14 px-2 py-1.5 text-xs bg-white border border-[#2D2D2D]/30 rounded-xl text-center"
                      title="開始分鐘 (0-59)"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-sans text-[#6E6A63]">
                    <span>時長：</span>
                    <select
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-[#2D2D2D]/30 rounded-lg text-xs"
                    >
                      <option value={30}>30 分鐘</option>
                      <option value={45}>45 分鐘</option>
                      <option value={60}>1 小時</option>
                      <option value={90}>1.5 小時</option>
                      <option value={120}>2 小時</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#2D2D2D] text-[#FAF7F0] rounded-xl text-xs font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer"
                  >
                    加入清單
                  </button>
                </div>
              </form>

              {/* Active Meetings List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-sans font-bold text-[#6E6A63] px-1">
                  <span>今日已登錄會議 ({activeMeetings.length})</span>
                  {activeMeetings.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>清空重置</span>
                    </button>
                  )}
                </div>

                {activeMeetings.length === 0 ? (
                  <div className="p-6 text-center text-xs font-sans text-[#6E6A63] bg-white rounded-2xl border border-dashed border-[#2D2D2D]/20">
                    目前今日尚無會議紀錄，靈魂處於最平和的摸魚狀態 ✨
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {activeMeetings.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 bg-white rounded-xl border border-[#2D2D2D]/20 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-mono font-bold text-[#2D2D2D] shrink-0">
                            {String(m.startHour).padStart(2, '0')}:{String(m.startMinute).padStart(2, '0')}
                          </span>
                          <span className="font-medium text-[#2D2D2D] truncate">
                            {m.title}
                          </span>
                          {m.isFridayAfterFour && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-sm shrink-0">
                              週五致命會
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[#6E6A63] font-sans text-[11px]">
                            {m.durationMinutes}m
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMeeting(m.id)}
                            className="p-1 text-[#6E6A63] hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF7F0] border-t border-[#2D2D2D]/20 p-4 flex items-center justify-between">
          <div className="text-xs font-sans text-[#6E6A63]">
            連動狀態：
            <span className={`font-bold ml-1 ${isConnected ? 'text-green-700' : 'text-[#6E6A63]'}`}>
              {isConnected ? '已啟用' : '未連動'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2D2D2D] text-[#FAF7F0] text-xs font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer shadow-sm"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  );
};
