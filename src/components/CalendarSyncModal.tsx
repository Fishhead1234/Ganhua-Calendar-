import React, { useState, useRef } from 'react';
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
  Upload,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CalendarMeeting,
  CalendarRoastResult,
  SCENARIO_PRESETS,
  analyzeCalendarEvents,
  fetchIcsWithCorsFallback,
  parseIcsFile,
  requestGoogleCalendarAccessToken,
  fetchGoogleCalendarEvents,
} from '../services/calendarService';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  activeMeetings: CalendarMeeting[];
  onUpdateMeetings: (meetings: CalendarMeeting[], presetId?: string | null) => void;
  onToggleConnected: (connected: boolean) => void;
  isPro: boolean;
  onOpenPaywall: () => void;
  activePresetId?: string | null;
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
  activePresetId,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'ical' | 'google' | 'custom'>('presets');
  const [icalUrl, setIcalUrl] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ganhua_ical_url') : '') || '';
  });
  const [customClientId, setCustomClientId] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('ganhua_google_client_id') : '') || '';
  });
  const [showClientIdInput, setShowClientIdInput] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New Custom Meeting Form State
  const [newTitle, setNewTitle] = useState('');
  const [newHour, setNewHour] = useState(14);
  const [newMinute, setNewMinute] = useState(0);
  const [newDuration, setNewDuration] = useState(60);

  if (!isOpen) return null;

  const currentRoast: CalendarRoastResult = analyzeCalendarEvents(activeMeetings, activePresetId || undefined);

  // --- Mode A: iCal (.ics) Fetch with CORS-safe proxy fallback ---
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
      const parsedMeetings = await fetchIcsWithCorsFallback(icalUrl.trim());
      onUpdateMeetings(parsedMeetings, null);
      onToggleConnected(true);
      setSuccessMsg(`🎉 同步成功！今日偵測到 ${parsedMeetings.length} 場會議，專屬吐槽已即時更新。`);
    } catch (err: any) {
      setErrorMsg(err.message || '同步失敗，請確認網址是否包含公開或私人 ics 權限。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Mode A: Local .ics File Upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const parsedMeetings = await parseIcsFile(file);
      onUpdateMeetings(parsedMeetings, null);
      onToggleConnected(true);
      setSuccessMsg(`📂 檔案解析成功！已載入今日 ${parsedMeetings.length} 場會議。`);
    } catch (err: any) {
      setErrorMsg(err.message || '讀取 .ics 檔案失敗');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Mode B: 1-Click Google Calendar OAuth Flow ---
  const handleGoogleCalendarAuth = async () => {
    if (!customClientId.trim()) {
      setShowClientIdInput(true);
      setErrorMsg(
        'Google 官方要求提供有效的 Google Cloud Client ID。若您尚未在 Google Cloud 建立專案，建議直接切換到上方「🔗 iCal 訂閱連結」（無需任何開發者設定，貼上網址即可立即連動！）。'
      );
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      localStorage.setItem('ganhua_google_client_id', customClientId.trim());
      const token = await requestGoogleCalendarAccessToken(customClientId.trim());
      const events = await fetchGoogleCalendarEvents(token);
      onUpdateMeetings(events, null);
      onToggleConnected(true);
      setSuccessMsg(`🎉 Google 日曆授權成功！已同步今日 ${events.length} 場會議行程。`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google 授權或同步失敗，請確認 Client ID 或網路設定。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Mode C: 1-Click Test Scenario Presets ---
  const handleApplyPreset = (presetId: string) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setErrorMsg(null);
    onUpdateMeetings(preset.events, preset.id);
    onToggleConnected(true);
    setSuccessMsg(`⚡ 已切換為【${preset.label}】情境！`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // --- Custom Meeting Handlers ---
  const handleAddCustomMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const isFridayAfterFour =
      new Date().getDay() === 5 && (newHour >= 16 || (newHour === 15 && newMinute >= 45));

    const newMeeting: CalendarMeeting = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      startHour: Number(newHour),
      startMinute: Number(newMinute),
      durationMinutes: Number(newDuration),
      isFridayAfterFour,
    };

    onUpdateMeetings([...activeMeetings, newMeeting], null);
    onToggleConnected(true);
    setNewTitle('');
    setSuccessMsg('會議已新增至今日清單！');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleDeleteMeeting = (id: string) => {
    onUpdateMeetings(
      activeMeetings.filter((m) => m.id !== id),
      null
    );
  };

  const handleClearAll = () => {
    onUpdateMeetings([], null);
    onToggleConnected(false);
    setSuccessMsg('已清空所有會議與連動狀態，恢復常規日曆！');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2D2D2D]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#FAF7F0] rounded-[28px] border-2 border-[#2D2D2D] shadow-[0_20px_50px_rgba(45,45,45,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#FAF7F0] border-b-2 border-[#2D2D2D] p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C83E31] text-[#FAF7F0] flex items-center justify-center border border-[#2D2D2D] shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-lg text-[#2D2D2D]">
                  行事曆智能吐槽連動
                </h3>
                <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded-full bg-[#D4B483] text-[#2D2D2D] border border-[#2D2D2D]/30">
                  PRO 專屬
                </span>
              </div>
              <p className="text-xs font-sans text-[#6E6A63]">
                支援 iCal 訂閱、Google 官方授權與 5 大職場情境模擬
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

        {/* Live Roast Preview Banner */}
        <div className="bg-[#F3EFE6] px-4 py-3 border-b border-[#2D2D2D]/20 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#C83E31] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-sans font-bold text-[#2D2D2D] truncate">
                {currentRoast.summaryBadge}
              </span>
              <span className="text-[10px] font-mono text-[#6E6A63] shrink-0">
                {currentRoast.totalMeetingHours}h
              </span>
            </div>
            <p className="text-xs font-serif text-[#C83E31] font-black truncate mt-0.5">
              「{currentRoast.roastQuote}」
            </p>
          </div>
        </div>

        {/* 4 Mode Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-[#2D2D2D]/20 bg-[#FAF7F0] text-[11px] font-sans font-bold text-center">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`py-2.5 transition border-b-2 flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'presets'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>⚡ 模擬情境</span>
            <span className="text-[9px] opacity-75">(一鍵測試)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ical')}
            className={`py-2.5 transition border-b-2 flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'ical'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>🔗 iCal 訂閱</span>
            <span className="text-[9px] opacity-75">(跨平台)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`py-2.5 transition border-b-2 flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'google'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>🔐 Google 連動</span>
            <span className="text-[9px] opacity-75">(OAuth)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`py-2.5 transition border-b-2 flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'custom'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>✏️ 自訂行程</span>
            <span className="text-[9px] opacity-75">({activeMeetings.length})</span>
          </button>
        </div>

        {/* Scroll Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Notification Banners */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-sans text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-sans text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Mode C - 5 Quick Test Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold text-[#2D2D2D] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#C83E31]" />
                  <span>⚡ 快速預覽情境 (測試用)</span>
                </span>
                <span className="text-[10px] font-sans text-[#6E6A63]">點擊立即觸發毒舌吐槽與專屬插畫</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SCENARIO_PRESETS.map((preset) => {
                  const isCurrent = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`p-3 rounded-2xl text-left border-2 transition cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#FAF7F0] border-[#C83E31] shadow-sm'
                          : 'bg-white border-[#2D2D2D]/20 hover:border-[#2D2D2D]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-black text-xs sm:text-sm text-[#2D2D2D]">
                            {preset.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-sans font-black px-1.5 py-0.5 rounded-md bg-[#C83E31] text-white">
                              使用中
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-sans text-[#6E6A63] mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#2D2D2D]/10 flex items-center justify-between text-[10px] font-sans">
                        <span className="text-[#C83E31] font-bold">
                          {preset.events.length} 場會議
                        </span>
                        <span className="text-[#6E6A63]">
                          觸發：{preset.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Mode A - iCal (.ics) with CORS Proxy & File Upload */}
          {activeTab === 'ical' && (
            <div className="space-y-4">
              <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#2D2D2D]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-sans font-bold text-[#2D2D2D] flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#C83E31]" />
                    <span>貼上私人 iCal / .ics 網址 (CORS 安全代理)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-[11px] font-sans text-[#6E6A63] hover:text-[#2D2D2D] flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>如何取得？</span>
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
                    className="px-4 py-2 bg-[#2D2D2D] text-[#FAF7F0] rounded-xl text-xs font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {isLoading ? '同步中...' : '立即同步'}
                  </button>
                </div>

                <div className="pt-2 border-t border-[#2D2D2D]/15 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[11px] font-sans text-[#6E6A63]">
                    或直接上傳本機已下載的 <strong>.ics</strong> 行事曆檔案：
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ics,text/calendar"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="ics-file-input"
                    />
                    <label
                      htmlFor="ics-file-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#2D2D2D]/30 text-[#2D2D2D] text-xs font-sans font-bold hover:border-[#2D2D2D] hover:bg-[#F3EFE6] transition cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#C83E31]" />
                      <span>選擇 .ics 檔案</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Accordion Guide on how to find iCal links */}
              {showGuide && (
                <div className="bg-[#F3EFE6] p-4 rounded-2xl border border-[#2D2D2D]/20 text-xs font-sans text-[#6E6A63] space-y-2">
                  <div className="font-bold text-[#2D2D2D]">💡 各大日曆取得「iCal 私人網址」步驟：</div>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
                    <li>
                      <strong className="text-[#2D2D2D]">Google 日曆</strong>：電腦網頁開啟 Google 日曆 ➔ 右上齒輪「設定」 ➔ 左欄點選您的日曆 ➔ 滾動到「整合日曆」 ➔ 複製<span className="text-[#C83E31] font-semibold">「iCal 格式的私人地址」</span>。
                    </li>
                    <li>
                      <strong className="text-[#2D2D2D]">Outlook 365</strong>：網頁版設定 ➔ 行事曆 ➔ 共用行事曆 ➔ 發布行事曆 ➔ 複製 <span className="text-[#C83E31] font-semibold">ICS 連結</span>。
                    </li>
                    <li>
                      <strong className="text-[#2D2D2D]">Apple 日曆 / iCloud</strong>：分享日曆 ➔ 複製 webcal 訂閱網址。
                    </li>
                  </ul>
                  <p className="text-[11px] text-[#6E6A63]/80 italic pt-1">
                    * 採用 CORS-Safe 安全反向代理封裝，並僅在您本機解析今日行程，絕不上傳雲端。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Mode B - 1-Click Google Calendar OAuth */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#2D2D2D]/20 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F0] border border-[#2D2D2D]/20 mx-auto flex items-center justify-center shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-black text-base text-[#2D2D2D]">
                    Google 官方日曆 OAuth 授權
                  </h4>
                  <p className="text-xs font-sans text-[#6E6A63] max-w-sm mx-auto leading-relaxed">
                    透過 Google Identity Services 唯讀授權讀取今日主日曆會議。
                  </p>
                </div>

                {/* Notice: Recommend iCal if no Client ID */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>沒有 Google Cloud Client ID？</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    Google 官方規定 OAuth 授權必須先在 Google Cloud Console 註冊 Web Client ID。若您沒有開發者帳號，<strong>強烈建議改用「🔗 iCal 訂閱連結」</strong>，直接貼上 Google 日曆的私人 iCal 網址即可連動，零設定秒搞定！
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ical')}
                    className="w-full py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-sans font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>前往「iCal 訂閱連結」分頁 (推薦・免設定)</span>
                  </button>
                </div>

                {/* Google Client ID Input Field */}
                <div className="text-left space-y-2 p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#2D2D2D]/20">
                  <label className="text-xs font-sans font-bold text-[#2D2D2D] block">
                    Google Cloud OAuth Client ID：
                  </label>
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#2D2D2D]/30 rounded-xl focus:outline-hidden focus:border-[#C83E31]"
                  />
                  <p className="text-[10px] text-[#6E6A63]">
                    * 在 Google Cloud Console 建立 OAuth 2.0 Web Client ID 並填入此處即可啟用一鍵連動。
                  </p>

                  <button
                    type="button"
                    onClick={handleGoogleCalendarAuth}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D2D2D] hover:bg-[#C83E31] text-[#FAF7F0] font-sans font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50 mt-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isLoading ? 'Google 驗證中...' : '使用 Client ID 授權連動'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Custom Meetings List & Editor */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddCustomMeeting}
                className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#2D2D2D]/20 space-y-3"
              >
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
                            {String(m.startHour).padStart(2, '0')}:
                            {String(m.startMinute).padStart(2, '0')}
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
            <span
              className={`font-bold ml-1 ${isConnected ? 'text-emerald-700' : 'text-[#6E6A63]'}`}
            >
              {isConnected ? '已啟用 (吐槽中)' : '未連動 (常規日曆)'}
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
