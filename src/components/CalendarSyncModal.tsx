import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Sparkles,
  Smartphone,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  CalendarMeeting,
  CalendarRoastResult,
  SCENARIO_PRESETS,
  GOOGLE_APPS_SCRIPT_SAMPLE,
  analyzeCalendarEvents,
  fetchNativeDeviceCalendarEvents,
  fetchLiveJsonCalendarEvents,
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
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  // Default to native tab if running on APK, otherwise presets or live JSON
  const [activeTab, setActiveTab] = useState<'presets' | 'native' | 'live_json' | 'custom'>(() => {
    return isNative ? 'native' : 'presets';
  });

  const [liveJsonUrl, setLiveJsonUrl] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('live_calendar_url') : '') || '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Custom Meeting Form State
  const [newTitle, setNewTitle] = useState('');
  const [newHour, setNewHour] = useState(14);
  const [newMinute, setNewMinute] = useState(0);
  const [newDuration, setNewDuration] = useState(60);

  if (!isOpen) return null;

  const currentRoast: CalendarRoastResult = analyzeCalendarEvents(activeMeetings, activePresetId || undefined);

  // --- Method 1: Native Phone Calendar Sync (Capacitor APK) ---
  const handleNativeCalendarSync = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const meetings = await fetchNativeDeviceCalendarEvents();
      onUpdateMeetings(meetings, null);
      onToggleConnected(true);
      setSuccessMsg(`📱 手機行事曆同步成功！已讀取今日 ${meetings.length} 場會議行程。`);
    } catch (err: any) {
      setErrorMsg(err.message || '讀取手機行事曆失敗，請確認已授權日曆讀取權限。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Method 2: Live Google Apps Script JSON Sync (Web Browser) ---
  const handleLiveJsonSync = async () => {
    if (!liveJsonUrl.trim()) {
      setErrorMsg('請先輸入 Google Apps Script 部署的 Web App URL 網址');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      localStorage.setItem('live_calendar_url', liveJsonUrl.trim());
      const meetings = await fetchLiveJsonCalendarEvents(liveJsonUrl.trim());
      onUpdateMeetings(meetings, null);
      onToggleConnected(true);
      setSuccessMsg(`🌐 即時行程連線成功！今日偵測到 ${meetings.length} 場會議。`);
    } catch (err: any) {
      setErrorMsg(err.message || '連線失敗，請確認 Apps Script 網址是否正確部署且權限為「任何人」。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Method 3: 1-Click Test Scenario Presets ---
  const handleApplyPreset = (presetId: string) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setErrorMsg(null);
    onUpdateMeetings(preset.events, preset.id);
    onToggleConnected(true);
    setSuccessMsg(`⚡ 已切換為【${preset.label}】情境！`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // Copy sample GAS script to clipboard
  const handleCopyGasSample = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SAMPLE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
                原生手機日曆零登入同步・網頁即時 JSON 串接・5 大情境模擬
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
            onClick={() => setActiveTab('native')}
            className={`py-2.5 transition border-b-2 flex flex-col items-center justify-center gap-0.5 relative ${
              activeTab === 'native'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>📱 手機同步</span>
            <span className="text-[9px] opacity-75">(APK 推薦)</span>
            {isNative && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live_json')}
            className={`py-2.5 transition border-b-2 flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'live_json'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>🌐 即時 JSON</span>
            <span className="text-[9px] opacity-75">(網頁測試)</span>
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

          {/* TAB 1: 5 Quick Test Presets (Mode C) */}
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

          {/* TAB 2: Native Android/iOS Phone Calendar Sync (Method 1) */}
          {activeTab === 'native' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#2D2D2D]/20 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F0] border border-[#2D2D2D]/20 mx-auto flex items-center justify-center shadow-xs">
                  <Smartphone className="w-6 h-6 text-[#C83E31]" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-black text-base text-[#2D2D2D]">
                    手機系統行事曆一鍵直連
                  </h4>
                  <p className="text-xs font-sans text-[#6E6A63] max-w-sm mx-auto leading-relaxed">
                    透過手機作業系統原生權限，直接讀取您手機中已同步的 <strong>Google 日曆、Outlook、三星日曆與 iCloud</strong> 行程。
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-left text-xs space-y-1 text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>免登入・免帳密・零 OAuth 繁瑣設定</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed pl-5">
                    只要您的手機已登入 Google 帳號，點擊即可直接抓取今日會議，絕不上傳任何個人資料至外部伺服器。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNativeCalendarSync}
                  disabled={isLoading}
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D2D2D] hover:bg-[#C83E31] text-[#FAF7F0] font-sans font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Smartphone className="w-4 h-4 text-[#D4B483]" />
                  <span>{isLoading ? '讀取行事曆中...' : '一鍵同步手機行事曆'}</span>
                </button>

                {!isNative && (
                  <p className="text-[11px] font-sans text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    ⚠️ 偵測到您目前在電腦瀏覽器環境中。若要在電腦測試，建議切換至「🌐 即時 JSON」或「⚡ 模擬情境」分頁！
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Live Google Apps Script JSON Sync (Method 2) */}
          {activeTab === 'live_json' && (
            <div className="space-y-4">
              <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#2D2D2D]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-sans font-bold text-[#2D2D2D] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#C83E31]" />
                    <span>貼上 Google Apps Script 部署網址 (Web App URL)</span>
                  </label>
                  <span className="text-[10px] font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                    零 CORS 阻擋
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={liveJsonUrl}
                    onChange={(e) => setLiveJsonUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#2D2D2D]/30 rounded-xl focus:outline-hidden focus:border-[#C83E31]"
                  />
                  <button
                    type="button"
                    onClick={handleLiveJsonSync}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#2D2D2D] text-[#FAF7F0] rounded-xl text-xs font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>重新整理行程</span>
                  </button>
                </div>

                {/* 3-Step Setup Instructions */}
                <div className="pt-2 border-t border-[#2D2D2D]/15 space-y-2 text-xs font-sans text-[#6E6A63]">
                  <div className="font-bold text-[#2D2D2D]">💡 3 步架設專屬 Google 日曆即時 JSON 串流：</div>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px]">
                    <li>
                      打開 <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-[#C83E31] underline font-bold inline-flex items-center gap-0.5">Google Apps Script <ExternalLink className="w-2.5 h-2.5" /></a> 點擊「新專案」。
                    </li>
                    <li>
                      貼上下方範本程式碼 ➔ 點擊右上角「部署」➔「新增部署作業」➔ 類型選「網路應用程式」。
                    </li>
                    <li>
                      存取權限選「所有人 (Anyone)」➔ 點擊部署並複製網址貼進上方輸入框！
                    </li>
                  </ol>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleCopyGasSample}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#2D2D2D]/30 text-[#2D2D2D] text-xs font-bold hover:bg-[#EAE3D5] transition cursor-pointer shadow-xs"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">已複製 Apps Script 範本程式碼！</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#C83E31]" />
                          <span>複製 Google Apps Script 範本程式碼</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Custom Today's Meetings */}
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
