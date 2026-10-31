import { CharacterType } from '../types/calendar';

export interface CalendarMeeting {
  id: string;
  title: string;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  durationMinutes: number;
  isFridayAfterFour?: boolean;
}

export interface CalendarRoastResult {
  meetingsCount: number;
  hasFridayLateMeeting: boolean;
  hasBackToBackMeetings: boolean;
  totalMeetingHours: number;
  summaryBadge: string;
  roastQuote: string;
  roastSubtext: string;
  yi: string;
  ji: string;
  character?: CharacterType;
  sceneId?: string;
  spriteSheet?: string;
  spritePosition?: string;
}

export interface CalendarPresetScenario {
  id: string;
  label: string;
  badge: string;
  description: string;
  events: CalendarMeeting[];
  forcedRoast?: Partial<CalendarRoastResult>;
}

/**
 * Copyable Google Apps Script template for zero-auth, zero-CORS JSON sync
 */
export const GOOGLE_APPS_SCRIPT_SAMPLE = `function doGet() {
  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // 讀取當日主日曆所有行程 (支援 Google 日曆自動同步)
  var events = CalendarApp.getDefaultCalendar().getEvents(start, end);
  var result = events.map(function(e) {
    return {
      title: e.getTitle() || "未命名會議",
      start: e.getStartTime().toISOString(),
      end: e.getEndTime().toISOString(),
      isAllDay: e.isAllDayEvent()
    };
  });

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * 5 Interactive Test Preset Scenarios
 */
export const SCENARIO_PRESETS: CalendarPresetScenario[] = [
  {
    id: 'slack_off',
    label: '🏖️ 0 場會議 (薪水小偷日)',
    badge: '摸魚神蹟',
    description: '行事曆一片淨土，適合安靜當個薪水小偷',
    events: [],
    forcedRoast: {
      summaryBadge: '📅 今日 0 場會議｜觸發【薪水小偷日】專屬吐槽',
      roastQuote: '今天行事曆一片淨土，適合安靜當個薪水小偷。',
      roastSubtext: '沒有會議就是最好的會議，趁主管沒發現前靜靜地把薪水領走。',
      yi: '帶薪上廁所・安靜地當一塊沒用的爛泥',
      ji: '在群組問「今天大家好像很閒」',
      character: 'cat',
      sceneId: 'cat_toilet_hide',
      spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
      spritePosition: '50% 0%',
    },
  },
  {
    id: 'monday_morning',
    label: '☕ 週一 09:00 早會',
    badge: '微弱求生',
    description: '週一一早就開會？不如先開箱我微弱的求生意志',
    events: [
      {
        id: 'm-mon-1',
        title: '全體每週啟動早會 Standup',
        startHour: 9,
        startMinute: 0,
        durationMinutes: 45,
      },
    ],
    forcedRoast: {
      summaryBadge: '📅 週一 09:00 早會｜觸發【求生意志】專屬吐槽',
      roastQuote: '週一一早就開會？不如先開箱我微弱的求生意志。',
      roastSubtext: '鬧鐘響了五次，靈魂還在被窩，肉體已經在開晨會做功德。',
      yi: '準備大杯冰美式・閉麥眼神渙散',
      ji: '在週一早上討論宏大的年度目標',
      character: 'cat',
      sceneId: 'cat_coffee',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '0% 0%',
    },
  },
  {
    id: 'meeting_hell',
    label: '🔥 今日 6 場連環會 (會議地獄)',
    badge: '會議地獄',
    description: '今天有 6 個會。建議靈魂直接請假，留肉體在座位上點頭就好',
    events: [
      { id: 'm-hell-1', title: '部門晨會', startHour: 9, startMinute: 30, durationMinutes: 30 },
      { id: 'm-hell-2', title: '跨組同步會', startHour: 10, startMinute: 30, durationMinutes: 60 },
      { id: 'm-hell-3', title: '客戶需求探討', startHour: 13, startMinute: 30, durationMinutes: 60 },
      { id: 'm-hell-4', title: '產品功能 Review', startHour: 15, startMinute: 0, durationMinutes: 45 },
      { id: 'm-hell-5', title: '專案排程復盤', startHour: 16, startMinute: 0, durationMinutes: 60 },
      { id: 'm-hell-6', title: '下班前總結會', startHour: 17, startMinute: 30, durationMinutes: 30 },
    ],
    forcedRoast: {
      summaryBadge: '📅 今日 6 場會議｜觸發【會議地獄】專屬吐槽',
      roastQuote: '今天有 6 個會。建議靈魂直接請假，留肉體在座位上點頭就好。',
      roastSubtext: '整天都在聽別人講廢話，自己一句有用的都沒做，薪水是拿來買精神撫慰金的。',
      yi: '開啟通話自動靜音・關掉攝影機打瞌睡',
      ji: '相信這場會能得出任何有建設性的結論',
      character: 'cat',
      sceneId: 'cat_meeting_loading',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '100% 50%',
    },
  },
  {
    id: 'performance_review',
    label: '📊 績效 Review / 1-on-1',
    badge: '職場假笑',
    description: '又到了大家用精美 PPT 互相傷害的環節',
    events: [
      {
        id: 'm-rev-1',
        title: 'Q4 季度績效考核 Review & 1-on-1 面談',
        startHour: 14,
        startMinute: 0,
        durationMinutes: 60,
      },
    ],
    forcedRoast: {
      summaryBadge: '📅 績效 Review・1-on-1｜觸發【職業假笑】專屬吐槽',
      roastQuote: '又到了大家用精美 PPT 互相傷害的環節。',
      roastSubtext: '畫大餅與甩鍋的顛峰對決，臉上帶著職業假笑，心裡默背勞基法。',
      yi: '保持尷尬而不失禮貌的微笑・點頭稱是',
      ji: '相信主管說的「明年一定幫你提報升遷」',
      character: 'cat',
      sceneId: 'cat_fake_smile',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '50% 50%',
    },
  },
  {
    id: 'friday_late_emergency',
    label: '💣 週五 16:30 臨時急件會',
    badge: '下班背刺',
    description: '週五下午四點後安排會議的人，下輩子走路會踢到桌腳',
    events: [
      {
        id: 'm-fri-1',
        title: '「順便聊一下」週五下班前緊急對齊',
        startHour: 16,
        startMinute: 30,
        durationMinutes: 60,
        isFridayAfterFour: true,
      },
    ],
    forcedRoast: {
      summaryBadge: '📅 週五 16:30 臨時急件會｜觸發【下班背刺】專屬吐槽',
      roastQuote: '週五下午四點後安排會議的人，下輩子走路會踢到桌腳。',
      roastSubtext: '明明可以用一封信講完的事，非要在週末前夕拉所有人陪葬。',
      yi: '假裝網路不順斷線退出・準時收書包',
      ji: '在 17:00 認真問「請問還有其他事項嗎」',
      character: 'cat',
      sceneId: 'cat_laptop_rage',
      spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
      spritePosition: '100% 0%',
    },
  },
];

export const MOCK_CALENDAR_PRESETS = SCENARIO_PRESETS;

/**
 * Intelligent Calendar Roast Analyzer
 * Matches meeting counts, keywords (Review, 1-on-1, All Hands, 開會, 面談), and timing
 */
export function analyzeCalendarEvents(events: CalendarMeeting[], presetId?: string): CalendarRoastResult {
  // Check if a preset is active with a forced roast
  if (presetId) {
    const foundPreset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (foundPreset?.forcedRoast) {
      let totalMinutes = 0;
      foundPreset.events.forEach((ev) => {
        totalMinutes += ev.durationMinutes;
      });
      return {
        meetingsCount: foundPreset.events.length,
        hasFridayLateMeeting: foundPreset.events.some((e) => e.isFridayAfterFour),
        hasBackToBackMeetings: foundPreset.events.length >= 4,
        totalMeetingHours: Math.round((totalMinutes / 60) * 10) / 10,
        summaryBadge: foundPreset.forcedRoast.summaryBadge || `📅 今日 ${foundPreset.events.length} 場會議`,
        roastQuote: foundPreset.forcedRoast.roastQuote || '開會就像通靈。',
        roastSubtext: foundPreset.forcedRoast.roastSubtext || '會議是社畜的職業傷害。',
        yi: foundPreset.forcedRoast.yi || '假裝在深思',
        ji: foundPreset.forcedRoast.ji || '認真舉手發言',
        character: foundPreset.forcedRoast.character || 'cat',
        sceneId: foundPreset.forcedRoast.sceneId,
        spriteSheet: foundPreset.forcedRoast.spriteSheet,
        spritePosition: foundPreset.forcedRoast.spritePosition,
      };
    }
  }

  const count = events.length;
  let totalMinutes = 0;
  let hasFridayLate = false;
  let hasReviewOr1on1 = false;
  let hasAllHands = false;
  let hasEarlyMonday = false;

  const todayDay = new Date().getDay();

  events.forEach((ev) => {
    totalMinutes += ev.durationMinutes;
    const lowerTitle = ev.title.toLowerCase();

    if (
      lowerTitle.includes('review') ||
      lowerTitle.includes('1-on-1') ||
      lowerTitle.includes('1:1') ||
      lowerTitle.includes('績效') ||
      lowerTitle.includes('考核') ||
      lowerTitle.includes('面談')
    ) {
      hasReviewOr1on1 = true;
    }

    if (
      lowerTitle.includes('all hands') ||
      lowerTitle.includes('town hall') ||
      lowerTitle.includes('townhall') ||
      lowerTitle.includes('全體大會') ||
      lowerTitle.includes('公司大會')
    ) {
      hasAllHands = true;
    }

    if (
      ev.isFridayAfterFour ||
      (todayDay === 5 && (ev.startHour >= 16 || (ev.startHour === 15 && ev.startMinute >= 45))) ||
      lowerTitle.includes('週五下班前') ||
      lowerTitle.includes('friday')
    ) {
      hasFridayLate = true;
    }

    if (
      (todayDay === 1 || lowerTitle.includes('週一') || lowerTitle.includes('monday')) &&
      ev.startHour <= 9
    ) {
      hasEarlyMonday = true;
    }
  });

  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const isBackToBack = count >= 4;

  // 1. Keyword: Performance Review / 1-on-1 / 面談
  if (hasReviewOr1on1) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: hasFridayLate,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日排程：偵測到 1-on-1 / 績效考核`,
      roastQuote: '又到了大家用精美 PPT 互相傷害的環節。',
      roastSubtext: '畫大餅與甩鍋的顛峰對決，臉上帶著職業假笑，心裡默背勞基法。',
      yi: '保持尷尬而不失禮貌的微笑・點頭稱是',
      ji: '相信主管說的「明年一定幫你提報升遷」',
      character: 'cat',
      sceneId: 'cat_fake_smile',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '50% 50%',
    };
  }

  // 2. Keyword/Time: Friday late afternoon meeting
  if (hasFridayLate) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: true,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${count} 場會議・偵測到週五致命末班會`,
      roastQuote: '週五下午四點後安排會議的人，下輩子走路會踢到桌腳。',
      roastSubtext: `明明可以用一封信講完的事，非要在週末前夕拉所有人陪葬。`,
      yi: '假裝網路不順斷線退出・眼神渙散點頭',
      ji: '在 17:00 認真問「請問還有其他事項嗎」',
      character: 'cat',
      sceneId: 'cat_laptop_rage',
      spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
      spritePosition: '100% 0%',
    };
  }

  // 3. Keyword: All Hands / 全體大會
  if (hasAllHands) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日偵測到 All Hands 全體大會`,
      roastQuote: '全體大會的最大收穫，就是確認主管的畫餅技巧又精進了。',
      roastSubtext: '台上講得熱血沸騰，台下忙著清空購物車與計算特休餘額。',
      yi: '自動切換為假人模式・帶薪補眠',
      ji: '在提問環節問「請問什麼時候調薪」',
      character: 'cat',
      sceneId: 'cat_meeting_loading',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '100% 50%',
    };
  }

  // 4. Monday morning meeting
  if (hasEarlyMonday) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 週一早會 (${count}場會議)：微弱電量掙扎中`,
      roastQuote: '週一一早就開會？不如先開箱我微弱的求生意志。',
      roastSubtext: '鬧鐘響了五次，靈魂還在被窩，肉體已經在開晨會做功德。',
      yi: '準備滿杯冰美式・只回貼圖與收到',
      ji: '在週一早上討論宏大的年度目標',
      character: 'cat',
      sceneId: 'cat_coffee',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '0% 0%',
    };
  }

  // 5. Meeting Hell: 5+ meetings or >= 4 hours
  if (count >= 5 || totalHours >= 4.0) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: true,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${count} 場會議 (${totalHours}小時)｜觸發【會議地獄】`,
      roastQuote: '今天有 6 個會。建議靈魂直接請假，留肉體在座位上點頭就好。',
      roastSubtext: `累積共 ${count} 場會議、${totalHours} 小時通靈時間，薪水是拿來買精神撫慰金的。`,
      yi: '開啟通話自動靜音・關掉攝影機打瞌睡',
      ji: '相信這場會能得出任何有建設性的結論',
      character: 'cat',
      sceneId: 'cat_meeting_loading',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '100% 50%',
    };
  }

  // 6. Moderate meetings: 1-4 meetings
  if (count >= 1) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${count} 場會議 (${totalHours}小時)：微弱電量掙扎中`,
      roastQuote: '能用一封 Email 講完的事，非要拉大家通靈一小時。',
      roastSubtext: `今日排程 ${count} 場會議，社交電池已被榨乾到僅剩紅燈。`,
      yi: '準備滿杯冰美式・只回貼圖與收到',
      ji: '主動發言說「我來負責後續追蹤」',
      character: 'cat',
      sceneId: 'cat_coffee',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '0% 0%',
    };
  }

  // 7. Zero meetings: Slack off day
  return {
    meetingsCount: 0,
    hasFridayLateMeeting: false,
    hasBackToBackMeetings: false,
    totalMeetingHours: 0,
    summaryBadge: '📅 今日 0 場會議｜觸發【薪水小偷日】專屬吐槽',
    roastQuote: '今天行事曆一片淨土，適合安靜當個薪水小偷。',
    roastSubtext: '沒有會議就是最好的會議，趁主管沒發現前靜靜地把薪水領走。',
    yi: '帶薪上廁所・安靜地當一塊沒用的爛泥',
    ji: '在群組問「今天大家好像很閒」',
    character: 'cat',
    sceneId: 'cat_toilet_hide',
    spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
    spritePosition: '50% 0%',
  };
}

/**
 * Method 1: Native Android/iOS Calendar Sync (Capacitor APK)
 * Reads phone OS calendar directly with zero OAuth and zero login!
 */
export async function fetchNativeDeviceCalendarEvents(
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  if (!isNative) {
    throw new Error('此功能僅能在手機 App (APK) 原生環境中直接讀取手機系統行事曆。在電腦瀏覽器請使用「即時 JSON 網址連動」！');
  }

  const win = window as any;
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Try @ebarooni/capacitor-calendar if available in plugins
  if (win.Capacitor?.Plugins?.CapacitorCalendar) {
    try {
      const plugin = win.Capacitor.Plugins.CapacitorCalendar;
      if (plugin.requestReadOnlyCalendarAccess) {
        await plugin.requestReadOnlyCalendarAccess();
      } else if (plugin.requestFullCalendarAccess) {
        await plugin.requestFullCalendarAccess();
      }

      const res = await plugin.listEventsInRange({
        startDate: startOfDay.getTime(),
        endDate: endOfDay.getTime(),
      });

      const rawEvents: any[] = res.result || [];
      return rawEvents.map((e, idx) => {
        const start = new Date(e.startDate || e.start || startOfDay.getTime());
        const end = new Date(e.endDate || e.end || start.getTime() + 60 * 60 * 1000);
        const startHour = start.getHours();
        const startMinute = start.getMinutes();
        const durationMinutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
        const isFridayAfterFour =
          targetDate.getDay() === 5 &&
          (startHour >= 16 || (startHour === 15 && startMinute >= 45));

        return {
          id: e.id || `native-${idx + 1}`,
          title: e.title || '未命名會議',
          startHour,
          startMinute,
          durationMinutes,
          isFridayAfterFour,
        };
      });
    } catch (pluginErr) {
      console.warn('CapacitorCalendar plugin failed, falling back to Ganhua bridge:', pluginErr);
    }
  }

  // 2. Direct Android CalendarContract read via GanhuaWidgetBridgePlugin
  if (win.Capacitor?.Plugins?.GanhuaWidgetBridge?.readDeviceCalendarEvents) {
    const bridge = win.Capacitor.Plugins.GanhuaWidgetBridge;
    const res = await bridge.readDeviceCalendarEvents();
    const rawEvents: any[] = res.events || [];

    return rawEvents.map((e, idx) => {
      const isFridayAfterFour =
        targetDate.getDay() === 5 &&
        (e.startHour >= 16 || (e.startHour === 15 && e.startMinute >= 45));

      return {
        id: `device-${idx + 1}`,
        title: e.title || '未命名會議',
        startHour: e.startHour || 0,
        startMinute: e.startMinute || 0,
        durationMinutes: e.durationMinutes || 60,
        isFridayAfterFour,
      };
    });
  }

  throw new Error('未偵測到手機行事曆支援外掛，請確認 App 是否已授權讀取日曆權限。');
}

/**
 * Method 2: Live Google Apps Script (GAS) JSON Sync (Web Browser)
 * Fetches JSON directly from user's deployed Google Apps Script web app URL
 */
export async function fetchLiveJsonCalendarEvents(
  rawUrl?: string,
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  const url =
    rawUrl?.trim() ||
    (typeof window !== 'undefined' ? localStorage.getItem('live_calendar_url') : null);

  if (!url) {
    throw new Error('請先輸入 Google Apps Script 部署網址（Web App URL）！');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`連線失敗 (HTTP ${res.status})，請確認 Google Apps Script 是否已部署為「任何人」皆可讀取。`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('回傳的資料不是陣列格式，請確認 Apps Script 程式碼是否回傳 JSON 陣列。');
  }

  const meetings: CalendarMeeting[] = [];

  data.forEach((item: any, idx: number) => {
    let startHour = 9;
    let startMinute = 0;
    let durationMinutes = 60;

    if (item.startHour !== undefined) {
      startHour = Number(item.startHour);
      startMinute = Number(item.startMinute || 0);
      durationMinutes = Number(item.durationMinutes || 60);
    } else if (item.start) {
      const sDate = new Date(item.start);
      if (!isNaN(sDate.getTime())) {
        startHour = sDate.getHours();
        startMinute = sDate.getMinutes();
        if (item.end) {
          const eDate = new Date(item.end);
          if (!isNaN(eDate.getTime())) {
            durationMinutes = Math.max(15, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60)));
          }
        }
      }
    }

    if (item.isAllDay) {
      durationMinutes = 480;
    }

    const isFridayAfterFour =
      targetDate.getDay() === 5 &&
      (startHour >= 16 || (startHour === 15 && startMinute >= 45));

    meetings.push({
      id: `live-json-${idx + 1}-${Date.now()}`,
      title: item.title || item.summary || '未命名會議',
      startHour,
      startMinute,
      durationMinutes,
      isFridayAfterFour,
    });
  });

  meetings.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  return meetings;
}

/**
 * Backward compatibility: Lightweight iCal Parser
 */
export function parseICSForToday(icsContent: string, targetDate: Date = new Date()): CalendarMeeting[] {
  const meetings: CalendarMeeting[] = [];
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let currentEvent: { summary?: string; dtstart?: string; dtend?: string } = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.dtstart) {
        const match = currentEvent.dtstart.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
        if (match) {
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const day = parseInt(match[3], 10);
          const hour = match[4] ? parseInt(match[4], 10) : 0;
          const minute = match[5] ? parseInt(match[5], 10) : 0;

          if (year === targetYear && month === targetMonth && day === targetDay) {
            meetings.push({
              id: `ics-${meetings.length + 1}-${Date.now()}`,
              title: currentEvent.summary || '未命名會議',
              startHour: hour,
              startMinute: minute,
              durationMinutes: 60,
              isFridayAfterFour: targetDate.getDay() === 5 && hour >= 16,
            });
          }
        }
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;
    if (line.startsWith('SUMMARY:')) {
      currentEvent.summary = line.substring(8).replace(/\\,/g, ',').replace(/\\;/g, ';');
    } else if (line.startsWith('DTSTART')) {
      const val = line.split(':')[1];
      if (val) currentEvent.dtstart = val.trim();
    }
  }

  return meetings;
}

export async function fetchIcsWithCorsFallback(rawUrl: string, targetDate: Date = new Date()): Promise<CalendarMeeting[]> {
  const cleanUrl = rawUrl.trim().replace(/^webcal:\/\//i, 'https://');
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      return parseICSForToday(text, targetDate);
    }
  } catch (e) {
    console.warn('Proxy fetch failed:', e);
  }
  throw new Error('無法讀取此 iCal 網址');
}

export async function parseIcsFile(file: File, targetDate: Date = new Date()): Promise<CalendarMeeting[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(parseICSForToday(text, targetDate));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}
