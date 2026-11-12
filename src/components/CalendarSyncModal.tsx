import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Sparkles,
  Smartphone,
  Globe,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  RefreshCw,
  Bell,
} from 'lucide-react';
import {
  CalendarMeeting,
  CalendarRoastResult,
  GOOGLE_APPS_SCRIPT_SAMPLE,
  analyzeCalendarEvents,
  fetchNativeDeviceCalendarEvents,
  fetchLiveCalendarFeed,
  DeviceCalendarSource,
  fetchDeviceCalendars,
  getEnabledCalendarIds,
  saveEnabledCalendarIds,
  syncAllCalendarRemindersViaBridge,
  cancelAllCalendarRemindersViaBridge,
  clearSyncedEventCustomizations,
} from '../services/calendarService';
import { APP_VERSION } from '../constants/version';

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
  isSyncing?: boolean;
  onForceResync?: () => Promise<void> | void;
  onRemoveSync?: () => void;
  onUnlockDevMode?: () => void;
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
  isSyncing,
  onForceResync,
  onRemoveSync,
  onUnlockDevMode,
}) => {
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  // Tab 1: Native Phone Calendar Sync, Tab 2: Universal iCal/URL feed
  const [activeTab, setActiveTab] = useState<'native' | 'live_json'>('native');

  const [liveJsonUrl, setLiveJsonUrl] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('live_calendar_url') : '') || '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);

  // Multi-Calendar Checklist State
  const [deviceCalendars, setDeviceCalendars] = useState<DeviceCalendarSource[]>([]);
  const [enabledCalendarIds, setEnabledCalendarIds] = useState<string[]>(() => {
    const saved = getEnabledCalendarIds();
    return saved !== null ? saved.map(String) : [];
  });

  useEffect(() => {
    let isMounted = true;
    fetchDeviceCalendars().then((cals) => {
      if (!isMounted) return;
      setDeviceCalendars(cals);
      const saved = getEnabledCalendarIds();
      if (saved !== null) {
        // Strictly respect user's saved selection (even if unchecked)
        setEnabledCalendarIds(saved.map(String));
      } else {
        // Default to all enabled only on very first run
        const allIds = cals.map((c) => String(c.id));
        setEnabledCalendarIds(allIds);
        saveEnabledCalendarIds(allIds);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleToggleCalendar = async (calId: string) => {
    const idStr = String(calId);
    const next = enabledCalendarIds.includes(idStr)
      ? enabledCalendarIds.filter((id) => id !== idStr)
      : [...enabledCalendarIds, idStr];
    const normalized = next.map(String);
    setEnabledCalendarIds(normalized);
    saveEnabledCalendarIds(normalized);

    // Immediately filter out events belonging to unchecked calendars from activeMeetings
    const filteredMeetings = activeMeetings.filter((m) => {
      if (m.source === 'local') return true;
      if (!m.calendarId) return true;
      return normalized.includes(String(m.calendarId));
    });
    onUpdateMeetings(filteredMeetings, activePresetId);
    try {
      localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(filteredMeetings));
    } catch {}

    // If native sync is active, re-sync with updated filter
    if (activeTab === 'native') {
      try {
        const meetings = await fetchNativeDeviceCalendarEvents();
        onUpdateMeetings(meetings, null);
      } catch (err) {
        console.warn('Re-syncing after calendar toggle error:', err);
      }
    }
  };

  const handleToggleAllCalendars = async () => {
    const allIds = deviceCalendars.map((c) => String(c.id));
    const enabledInList = deviceCalendars.filter((c) => enabledCalendarIds.includes(String(c.id)));
    const next = enabledInList.length === allIds.length ? [] : allIds;
    const normalized = next.map(String);
    setEnabledCalendarIds(normalized);
    saveEnabledCalendarIds(normalized);

    const filteredMeetings = activeMeetings.filter((m) => {
      if (m.source === 'local') return true;
      if (!m.calendarId) return true;
      return normalized.includes(String(m.calendarId));
    });
    onUpdateMeetings(filteredMeetings, activePresetId);
    try {
      localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(filteredMeetings));
    } catch {}

    if (activeTab === 'native') {
      try {
        const meetings = await fetchNativeDeviceCalendarEvents();
        onUpdateMeetings(meetings, null);
      } catch (err) {
        console.warn('Re-syncing all calendars error:', err);
      }
    }
  };

  const handleFinish = async () => {
    const normalized = enabledCalendarIds.map(String);
    saveEnabledCalendarIds(normalized);

    // Auto-activate master Calendar Sync toggle when syncing or clicking "完成設定"
    if (normalized.length > 0 || activeMeetings.length > 0) {
      onToggleConnected(true);
    }

    // Immediately filter out events belonging to unchecked calendars
    const filteredMeetings = activeMeetings.filter((m) => {
      if (m.source === 'local') return true;
      if (!m.calendarId) return true;
      return normalized.includes(String(m.calendarId));
    });
    onUpdateMeetings(filteredMeetings, activePresetId);
    try {
      localStorage.setItem('ganhua_calendar_meetings', JSON.stringify(filteredMeetings));
    } catch {}

    onClose();
  };

  const handleVersionClick = () => {
    const next = versionTapCount + 1;
    if (next >= 7) {
      setVersionTapCount(0);
      onUnlockDevMode?.();
      setSuccessMsg('🛠️ 已解鎖開發者模式！底部角色切換器已開啟。');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setVersionTapCount(next);
      setTimeout(() => setVersionTapCount(0), 3000);
    }
  };

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
      syncAllCalendarRemindersViaBridge(meetings);
      setSuccessMsg(`📱 手機行事曆同步成功！已讀取今日 ${meetings.length} 場行程，並已排定提醒通知。`);
    } catch (err: any) {
      setErrorMsg(err.message || '讀取手機行事曆失敗，請確認已授權日曆讀取權限。');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Method 2: Live Universal Calendar Feed Sync (iCal / webcal / GAS) ---
  const handleLiveJsonSync = async () => {
    if (!liveJsonUrl.trim()) {
      setErrorMsg('請先輸入日曆網址（支援 Google/Apple iCal、Outlook、.ics 或 Apps Script）');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      localStorage.setItem('live_calendar_url', liveJsonUrl.trim());
      const meetings = await fetchLiveCalendarFeed(liveJsonUrl.trim());
      onUpdateMeetings(meetings, null);
      onToggleConnected(true);
      syncAllCalendarRemindersViaBridge(meetings);
      const urlCount = liveJsonUrl.split(/[\r\n,;]+/).filter((u) => u.trim().length > 0).length;
      setSuccessMsg(`🌐 日曆連線成功！已同步 ${urlCount} 個日曆網址來源，共抓取 ${meetings.length} 場行程，並已排定提醒通知。`);
    } catch (err: any) {
      setErrorMsg(err.message || '連線失敗，請確認日曆網址是否正確且公開可用。');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy sample GAS script to clipboard
  const handleCopyGasSample = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SAMPLE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetToCleanState = () => {
    // 1. Clear saved URL input and local storage items
    setLiveJsonUrl('');
    try {
      localStorage.removeItem('live_calendar_url');
      localStorage.removeItem('ganhua_calendar_meetings');
      localStorage.removeItem('ganhua_active_preset_id');
      localStorage.removeItem('ganhua_enabled_calendar_ids');
    } catch {}

    // 2. Clear enabled calendar selections
    setEnabledCalendarIds([]);
    saveEnabledCalendarIds([]);

    // 3. Clear meeting state in parent and disconnect
    onUpdateMeetings([], null);
    onToggleConnected(false);
    onRemoveSync?.();

    // 4. Cancel bridge reminders & clear notifications tray
    cancelAllCalendarRemindersViaBridge();
    clearSyncedEventCustomizations();

    setSuccessMsg('✅ 已完全解除連動並清空快取，日曆已恢復純淨常規狀態！');
    setTimeout(() => setSuccessMsg(null), 3500);
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
                  行事曆連動
                </h3>
                <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded-full bg-[#D4B483] text-[#2D2D2D] border border-[#2D2D2D]/30">
                  PRO 專屬
                </span>
              </div>
              <p className="text-xs font-sans text-[#6E6A63]">
                同步手機行事曆，讓日常行程自動轉換為專屬幹話
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

        {/* 2 Clean Mode Navigation Tabs */}
        <div className="grid grid-cols-2 border-b border-[#2D2D2D]/20 bg-[#FAF7F0] text-xs font-sans font-bold text-center">
          <button
            type="button"
            onClick={() => setActiveTab('native')}
            className={`py-3 transition border-b-2 flex items-center justify-center gap-1.5 relative ${
              activeTab === 'native'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>📱 手機行事曆同步</span>
            <span className="text-[10px] opacity-80">(原生直連)</span>
            {isNative && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live_json')}
            className={`py-3 transition border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'live_json'
                ? 'border-[#C83E31] text-[#C83E31] bg-[#F9F6F0]'
                : 'border-transparent text-[#6E6A63] hover:text-[#2D2D2D]'
            }`}
          >
            <span>🌐 網址訂閱 (iCal)</span>
            <span className="text-[10px] opacity-80">(外部/工作)</span>
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

          {/* TAB 1: Native Android/iOS Phone Calendar Sync */}
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
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D2D2D] hover:bg-[#C83E31] text-[#FAF7F0] font-sans font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
                >
                  <Smartphone className="w-4 h-4 text-[#D4B483]" />
                  <span>{isLoading ? '讀取行事曆中...' : '一鍵同步手機行事曆'}</span>
                </button>

                {/* Multi-Calendar Checklist */}
                {deviceCalendars.length > 0 && (() => {
                  const enabledInList = deviceCalendars.filter((c) => enabledCalendarIds.includes(String(c.id)));
                  return (
                    <div className="bg-[#FAF7F0] p-4 rounded-2xl border-2 border-[#2D2D2D]/20 text-left space-y-3 pt-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">📂</span>
                          <span className="font-serif font-black text-xs sm:text-sm text-[#2D2D2D]">
                            已連結的行事曆來源
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#2D2D2D]/10 text-[#6E6A63]">
                            {enabledInList.length} / {deviceCalendars.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleAllCalendars}
                          className="text-[10px] font-sans font-bold text-[#C83E31] hover:underline cursor-pointer"
                        >
                          {enabledInList.length === deviceCalendars.length ? '全部取消' : '全選所有日曆'}
                        </button>
                      </div>

                      <p className="text-[11px] font-sans text-[#6E6A63] leading-relaxed">
                        勾選您希望日曆讀取的行事曆（已為您預設勾選常用行事曆，可隨時自訂勾選或取消）：
                      </p>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {deviceCalendars.map((cal) => {
                          const isChecked = enabledCalendarIds.includes(String(cal.id));
                          return (
                            <label
                              key={cal.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-white border-[#2D2D2D]/30 shadow-xs'
                                  : 'bg-[#F3EFE6]/60 border-transparent opacity-60 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCalendar(cal.id)}
                                  className="w-4 h-4 rounded text-[#C83E31] border-stone-300 focus:ring-[#C83E31] cursor-pointer"
                                />
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-black/10"
                                  style={{ backgroundColor: cal.color || '#2D2D2D' }}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-sans font-bold text-xs text-[#2D2D2D] truncate">
                                      {cal.name}
                                    </span>
                                    {cal.isPrimary && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#D4B483]/30 text-[#785A3C] font-bold shrink-0">
                                        主要
                                      </span>
                                    )}
                                  </div>
                                  {cal.accountName && (
                                    <p className="text-[10px] font-mono text-[#6E6A63] truncate">
                                      {cal.accountName}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-sans font-bold shrink-0 px-2 py-0.5 rounded-full ${
                                  isChecked
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-stone-200 text-stone-500'
                                }`}
                              >
                                {isChecked ? '已啟用' : '已停用'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: Live Universal Calendar Feed (iCal / webcal / GAS) */}
          {activeTab === 'live_json' && (
            <div className="space-y-4">
              <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#2D2D2D]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-sans font-bold text-[#2D2D2D] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#C83E31]" />
                    <span>貼上日曆網址（支援多個網址，一行一個）</span>
                  </label>
                  <span className="text-[10px] font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                    原生零 CORS
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={liveJsonUrl}
                    onChange={(e) => setLiveJsonUrl(e.target.value)}
                    placeholder={"https://calendar.google.com/calendar/ical/.../basic.ics\nwebcal://example.com/calendar.ics"}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#2D2D2D]/30 rounded-xl focus:outline-hidden focus:border-[#C83E31] leading-relaxed resize-y"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-sans text-[#6E6A63]">
                      💡 支援同時輸入 Google 日曆、Outlook、Apple iCal 或公開/私人 .ics 訂閱連結
                    </span>
                    <button
                      type="button"
                      onClick={handleLiveJsonSync}
                      disabled={isLoading || isSyncing}
                      className="px-4 py-2 bg-[#2D2D2D] text-[#FAF7F0] rounded-xl text-xs font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isLoading || isSyncing ? '同步中...' : '一鍵同步所有網址'}</span>
                    </button>
                  </div>
                </div>

                {/* Explanations for iCal and GAS */}
                <div className="pt-2 border-t border-[#2D2D2D]/15 space-y-2 text-xs font-sans text-[#6E6A63]">
                  <div className="font-bold text-[#2D2D2D]">🌐 支援的日曆來源說明：</div>
                  <ul className="space-y-1.5 text-[11px] leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#C83E31] font-bold">●</span>
                      <span><strong>iCal / webcal 訂閱：</strong>直接貼上任何 <code>.ics</code> 或 <code>webcal://</code> 網址（例如 Google 日曆公開/私人網址、Outlook、Apple 行事曆或公司日曆），系統原生連線無 CORS 限制。</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#C83E31] font-bold">●</span>
                      <span><strong>多網址自動合併：</strong>可一次貼上多個日曆（一行一個），系統將自動排重合併呈現。</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-[#C83E31] font-bold">●</span>
                      <span><strong>Google Apps Script 備用範本：</strong>支援透過自建 Apps Script JSON 串接公司內部 Google Workspace 日曆。</span>
                    </li>
                  </ul>

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
                          <span>複製 Google Apps Script 備用範本</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 1. Android Widget Setup Guidance Info Box */}
        <div className="mx-4 sm:mx-6 mb-2 p-3 rounded-2xl border border-[#2D2D2D]/15 bg-stone-50/90 flex items-start gap-2.5 text-left shadow-2xs">
          <span className="text-base shrink-0">📱</span>
          <div className="text-[11px] font-sans text-[#4A463F] leading-relaxed">
            <div className="font-bold text-[#2D2D2D] mb-0.5">桌面小工具 (Widgets) 新增方式：</div>
            在手機主畫面長按空白處 → 點選「小工具/微件」→ 選擇「幹話日曆」即可新增 4×5 擬真撕頁桌曆、1×1 打卡章、4×2 與 4×4 農曆月曆。
          </div>
        </div>

        {/* 2. Notification Reminder Banner (Production Clean - without test buttons) */}
        <div className="mx-4 sm:mx-6 mb-3 p-3 rounded-2xl border border-[#2D2D2D]/15 bg-white/90 flex items-center gap-2.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-sans font-bold text-xs text-[#2D2D2D] truncate">
              行程即時提醒（如同 Google 日曆）
            </h4>
            <p className="font-sans text-[11px] text-[#6E6A63] leading-tight">
              行程開始前 10 分鐘自動跳出高優先級通知與社畜吐槽建議
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FAF7F0] border-t border-[#2D2D2D]/20 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-xs font-sans text-[#6E6A63] flex items-center gap-1.5">
              <span>連動狀態：</span>
              <span
                className={`font-bold ${isConnected ? 'text-emerald-700' : 'text-[#6E6A63]'}`}
              >
                {isConnected ? '已啟用 (吐槽中)' : '未連動 (常規日曆)'}
              </span>
              <button
                type="button"
                onClick={handleVersionClick}
                className="text-[10px] font-mono text-[#6E6A63]/70 font-semibold bg-[#2D2D2D]/5 hover:bg-[#2D2D2D]/10 px-1.5 py-0.5 rounded border border-[#2D2D2D]/10 cursor-pointer transition"
                title="連續點擊 7 次以開啟/關閉內部管理員工具列"
              >
                v{APP_VERSION}
              </button>
            </div>

            {/* Reset to Clean State / Unlink Button */}
            <button
              type="button"
              onClick={handleResetToCleanState}
              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-sans font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
              title="清除所有行事曆快取、取消勾選並完全恢復純淨常規日曆"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
              <span>{isConnected ? '解除連動' : '一鍵重設純淨日曆'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Force 1-Push Re-sync Button */}
            {onForceResync && (
              <button
                type="button"
                onClick={() => {
                  onForceResync();
                }}
                disabled={isSyncing || isLoading}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-[#FAF7F0] text-xs font-sans font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isLoading ? 'animate-spin' : ''}`} />
                <span>一鍵強制重新同步</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 rounded-xl bg-[#2D2D2D] text-[#FAF7F0] text-xs font-sans font-bold hover:bg-[#C83E31] transition cursor-pointer shadow-sm active:scale-95"
            >
              完成設定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
