import { CharacterType } from '../types/calendar';
import { toLocalDateKey, parseLocalDateKey } from '../utils/dateUtils';

export interface CalendarMeeting {
  id: string;
  title: string;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  durationMinutes: number;
  isFridayAfterFour?: boolean;
  dateKey?: string; // YYYY-MM-DD
  notes?: string;
  isAllDay?: boolean;
  source?: 'local' | 'synced' | 'preset';
  calendarId?: string;
  calendarName?: string;
  calendarColor?: string;
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

  // 讀取所有日曆（支援工作、家庭、學校等全日曆聯動）
  var allCalendars = CalendarApp.getAllCalendars();
  var result = [];

  allCalendars.forEach(function(cal) {
    try {
      var events = cal.getEvents(start, end);
      events.forEach(function(e) {
        result.push({
          title: e.getTitle() || "未命名會議",
          start: e.getStartTime().toISOString(),
          end: e.getEndTime().toISOString(),
          isAllDay: e.isAllDayEvent(),
          calendarName: cal.getName(),
          calendarColor: cal.getColor()
        });
      });
    } catch (err) {}
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
  let hasParentOrSchool = false;

  const todayDay = new Date().getDay();

  events.forEach((ev) => {
    totalMinutes += ev.durationMinutes;
    const lowerTitle = (ev.title || '').toLowerCase();
    const lowerCalName = (ev.calendarName || '').toLowerCase();
    const combo = `${lowerTitle} ${lowerCalName}`;

    if (
      combo.includes('school') ||
      combo.includes('parent') ||
      combo.includes('schoolsbuddy') ||
      combo.includes('家長') ||
      combo.includes('學校') ||
      combo.includes('班級') ||
      combo.includes('小孩') ||
      combo.includes('家庭') ||
      combo.includes('家長會') ||
      combo.includes('聯絡簿') ||
      combo.includes('接送') ||
      combo.includes('家長日')
    ) {
      hasParentOrSchool = true;
    }

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

  // 1. Keyword: School / Parent / Family
  if (hasParentOrSchool) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: hasFridayLate,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: '🎒 偵測到【學校/家長行程】專屬吐槽',
      roastQuote: '自己當社畜就算了，下班還要當小孩的專屬司機兼書僮。',
      roastSubtext: '白天被老闆KPI折磨，晚上被學校聯絡簿與家長會群組二度審查。',
      yi: '假笑點頭兼準時接送・深呼吸修煉脾氣',
      ji: '在班級家長群組手滑誤傳上班幹話・忘簽聯絡簿',
      character: 'cat',
      sceneId: 'cat_coffee',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '0% 0%',
    };
  }

  // 2. Keyword: Performance Review / 1-on-1 / 面談
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

export interface DeviceCalendarSource {
  id: string;
  name: string;
  accountName?: string;
  color?: string;
  isPrimary?: boolean;
}

const ENABLED_CALENDARS_STORAGE_KEY = 'enabled_calendar_ids';

export function getEnabledCalendarIds(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ENABLED_CALENDARS_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

export function saveEnabledCalendarIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const normalized = Array.from(new Set(ids.map(String)));
  localStorage.setItem(ENABLED_CALENDARS_STORAGE_KEY, JSON.stringify(normalized));
}

export async function fetchDeviceCalendars(): Promise<DeviceCalendarSource[]> {
  const win = typeof window !== 'undefined' ? (window as any) : {};
  let calendars: DeviceCalendarSource[] = [];

  // 1. Try CapacitorCalendar if available
  if (win.Capacitor?.Plugins?.CapacitorCalendar?.listCalendars) {
    try {
      const res = await win.Capacitor.Plugins.CapacitorCalendar.listCalendars();
      const list = res.result || res.calendars || [];
      calendars = list.map((c: any) => {
        let name = c.name || c.title || '未命名日曆';
        const accountName = c.accountName || c.source || '';
        const lowerStr = (name + ' ' + accountName).toLowerCase();
        if (lowerStr.includes('schoolsbuddy')) {
          name = '🏫 SchoolsBuddy (學校日曆)';
        } else if (name.startsWith('http://') || name.startsWith('https://')) {
          name = `🌐 訂閱日曆 (${name.replace(/^https?:\/\//, '').split('/')[0]})`;
        }
        return {
          id: String(c.id),
          name,
          accountName,
          color: c.color || (lowerStr.includes('schoolsbuddy') ? '#0F9D58' : '#2D2D2D'),
          isPrimary: Boolean(c.isPrimary),
        };
      });
    } catch (e) {
      console.warn('CapacitorCalendar.listCalendars error:', e);
    }
  }

  // 2. Try GanhuaWidgetBridge
  if (calendars.length === 0 && win.Capacitor?.Plugins?.GanhuaWidgetBridge?.listCalendars) {
    try {
      const res = await win.Capacitor.Plugins.GanhuaWidgetBridge.listCalendars();
      const list = res.calendars || [];
      calendars = list.map((c: any) => {
        let name = c.name || c.title || '未命名日曆';
        const accountName = c.accountName || '';
        const lowerStr = (name + ' ' + accountName).toLowerCase();
        if (lowerStr.includes('schoolsbuddy')) {
          name = '🏫 SchoolsBuddy (學校日曆)';
        } else if (name.startsWith('http://') || name.startsWith('https://')) {
          name = `🌐 訂閱日曆 (${name.replace(/^https?:\/\//, '').split('/')[0]})`;
        }
        return {
          id: String(c.id),
          name,
          accountName,
          color: c.color || (lowerStr.includes('schoolsbuddy') ? '#0F9D58' : '#2D2D2D'),
          isPrimary: Boolean(c.isPrimary),
        };
      });
    } catch (e) {
      console.warn('GanhuaWidgetBridge.listCalendars error:', e);
    }
  }

  // 3. Fallback for Web browser preview / test
  if (calendars.length === 0) {
    calendars = [
      { id: 'cal_work', name: '工作會議 (Google Calendar)', accountName: 'work@corp.com', color: '#4285F4', isPrimary: true },
      { id: 'cal_parent', name: '學校與家長聯絡簿 (SchoolsBuddy)', accountName: 'parents@school.edu', color: '#0F9D58' },
      { id: 'cal_family', name: '家庭日曆 (Family)', accountName: 'home@family.net', color: '#EA4335' },
      { id: 'cal_personal', name: '個人行程 (Personal)', accountName: 'me@gmail.com', color: '#FBBC05' },
    ];
  }

  // Deduplicate calendars strictly by String(cal.id)
  // Do NOT deduplicate by title or name (user may have multiple accounts each with a "My calendar")
  const seenIds = new Set<string>();
  const uniqueCalendars: DeviceCalendarSource[] = [];
  for (const cal of calendars) {
    const calId = String(cal.id);
    if (!seenIds.has(calId)) {
      seenIds.add(calId);
      uniqueCalendars.push({
        ...cal,
        id: calId,
      });
    }
  }

  // ONLY default to selecting all calendars on the very first run when localStorage.getItem('enabled_calendar_ids') === null
  const rawSaved = typeof window !== 'undefined' ? localStorage.getItem(ENABLED_CALENDARS_STORAGE_KEY) : null;
  if (rawSaved === null) {
    saveEnabledCalendarIds(uniqueCalendars.map((c) => c.id));
  }

  return uniqueCalendars;
}

/**
 * Method 1: Native Android/iOS Calendar Sync (Capacitor APK)
 * Reads phone OS calendar directly with zero OAuth and zero login!
 */
export async function fetchNativeDeviceCalendarEvents(
  targetDate: Date = new Date(),
  options?: { startDate?: Date; endDate?: Date }
): Promise<CalendarMeeting[]> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  if (!isNative) {
    throw new Error('此功能僅能在手機 App (APK) 原生環境中直接讀取手機系統行事曆。在電腦瀏覽器請使用「即時 JSON 網址連動」！');
  }

  // 1. Build calendar lookup map strictly by String(id)
  const calendarMap = new Map<string, DeviceCalendarSource>();
  let allCalendars: DeviceCalendarSource[] = [];
  try {
    allCalendars = await fetchDeviceCalendars();
    for (const c of allCalendars) {
      calendarMap.set(String(c.id), c);
    }
  } catch (err) {
    console.warn('Failed to load device calendars for mapping:', err);
  }

  const enabledIds = getEnabledCalendarIds();
  const enabledSet = enabledIds !== null ? new Set(enabledIds.map(String)) : null;
  const allEnabled = enabledSet === null || (allCalendars.length > 0 && allCalendars.every((c) => enabledSet.has(c.id)));

  const isEventEnabled = (rawCalId: any): boolean => {
    if (enabledSet === null) return true; // first run default
    if (rawCalId !== undefined && rawCalId !== null && String(rawCalId).trim() !== '') {
      return enabledSet.has(String(rawCalId));
    }
    // If event.calendarId is missing/unmapped, include if all calendars are enabled
    return allEnabled;
  };

  const win = window as any;
  const startOfDay = options?.startDate || new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() - 30, 0, 0, 0, 0);
  const endOfDay = options?.endDate || new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 60, 23, 59, 59, 999);

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
      const meetings = rawEvents
        .filter((e) => {
          const calId = e.calendarId ?? e.calendar_id;
          return isEventEnabled(calId);
        })
        .map((e, idx) => {
          const start = new Date(e.startDate || e.start || startOfDay.getTime());
          const end = new Date(e.endDate || e.end || start.getTime() + 60 * 60 * 1000);
          const isAllDay = Boolean(e.isAllDay || e.allDay);
          const dateKey = toLocalDateKey(start);
          const startHour = isAllDay ? 9 : start.getHours();
          const startMinute = isAllDay ? 0 : start.getMinutes();
          const durationMinutes = isAllDay ? 480 : Math.max(15, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
          const isFridayAfterFour =
            start.getDay() === 5 &&
            (startHour >= 16 || (startHour === 15 && startMinute >= 45));

          const rawCalId = e.calendarId ?? e.calendar_id;
          const calIdStr = rawCalId !== undefined && rawCalId !== null && String(rawCalId).trim() !== ''
            ? String(rawCalId)
            : undefined;
          const matchedCal = calIdStr ? calendarMap.get(calIdStr) : undefined;
          const calendarName = matchedCal?.name || e.calendarName || e.calendarTitle || matchedCal?.accountName;
          const calendarColor = matchedCal?.color || e.calendarColor || e.color || '#2D2D2D';

          return {
            id: String(e.id || `native-${idx + 1}`),
            title: e.title || '未命名會議',
            startHour,
            startMinute,
            durationMinutes,
            isFridayAfterFour,
            dateKey,
            isAllDay,
            source: 'synced' as const,
            calendarId: calIdStr,
            calendarName,
            calendarColor,
          };
        });
      return meetings;
    } catch (pluginErr) {
      console.warn('CapacitorCalendar plugin failed, falling back to Ganhua bridge:', pluginErr);
    }
  }

  // 2. Direct Android CalendarContract read via GanhuaWidgetBridgePlugin
  if (win.Capacitor?.Plugins?.GanhuaWidgetBridge?.readDeviceCalendarEvents) {
    const bridge = win.Capacitor.Plugins.GanhuaWidgetBridge;
    const res = await bridge.readDeviceCalendarEvents({
      startDate: startOfDay.getTime(),
      endDate: endOfDay.getTime(),
    });
    const rawEvents: any[] = res.events || [];

    const meetings: CalendarMeeting[] = rawEvents
      .filter((e) => {
        const calId = e.calendarId ?? e.calendar_id;
        return isEventEnabled(calId);
      })
      .map((e, idx) => {
        const isAllDay = Boolean(e.isAllDay);
        let dateKey = e.dateKey;
        if (!dateKey) {
          if (isAllDay && e.beginMs) {
            const d = new Date(e.beginMs);
            dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
          } else if (e.beginMs) {
            dateKey = toLocalDateKey(new Date(e.beginMs));
          } else {
            dateKey = toLocalDateKey(targetDate);
          }
        }

        const [y, m, d] = dateKey.split('-').map(Number);
        const evDate = new Date(y, (m || 1) - 1, d || 1);
        const startHour = Number(e.startHour ?? (isAllDay ? 9 : 0));
        const startMinute = Number(e.startMinute ?? 0);
        const durationMinutes = isAllDay ? 480 : Number(e.durationMinutes || 60);

        const isFridayAfterFour =
          evDate.getDay() === 5 &&
          (startHour >= 16 || (startHour === 15 && startMinute >= 45));

        const rawCalId = e.calendarId ?? e.calendar_id;
        const calIdStr = rawCalId !== undefined && rawCalId !== null && String(rawCalId).trim() !== ''
          ? String(rawCalId)
          : undefined;
        const matchedCal = calIdStr ? calendarMap.get(calIdStr) : undefined;
        const calendarName = matchedCal?.name || e.calendarName || matchedCal?.accountName;
        const calendarColor = matchedCal?.color || e.calendarColor || '#2D2D2D';

        return {
          id: String(e.id || `device-${idx + 1}`),
          title: e.title || '未命名會議',
          startHour,
          startMinute,
          durationMinutes,
          isFridayAfterFour,
          dateKey,
          isAllDay,
          source: 'synced' as const,
          calendarId: calIdStr,
          calendarName,
          calendarColor,
        };
      });
    return meetings;
  }

  throw new Error('未偵測到手機行事曆支援外掛，請確認 App 是否已授權讀取日曆權限。');
}

/**
 * Helper: Parse iCalendar timestamp string into local Date and all-day flag.
 * Handles UTC (ending in Z), Local/Floating (no Z), and All-Day (YYYYMMDD).
 */
export function parseIcsTimestamp(val: string): { date: Date; isAllDay: boolean } | null {
  if (!val) return null;
  const clean = val.replace(/^.*:/, '').trim();

  // All-day: YYYYMMDD (8 digits)
  if (/^\d{8}$/.test(clean)) {
    const y = parseInt(clean.substring(0, 4), 10);
    const m = parseInt(clean.substring(4, 6), 10);
    const d = parseInt(clean.substring(6, 8), 10);
    return { date: new Date(y, m - 1, d, 0, 0, 0, 0), isAllDay: true };
  }

  // Date-time: YYYYMMDDTHHMMSS(Z)?
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const mon = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const h = parseInt(match[4], 10);
    const min = parseInt(match[5], 10);
    const sec = parseInt(match[6], 10);
    const isUtc = Boolean(match[7]);

    // If UTC (Z), construct UTC Date so that getHours() / toLocalDateKey() converts to local timezone!
    const date = isUtc ? new Date(Date.UTC(y, mon, d, h, min, sec)) : new Date(y, mon, d, h, min, sec);
    return { date, isAllDay: false };
  }

  return null;
}

/**
 * Universal iCalendar / webcal Parser
 * Correctly parses multi-day events, UTC timezone conversions, and assigns local dateKey.
 * Supports SchoolsBuddy, Google Calendar ICS, Outlook, and Apple iCal feeds.
 */
export function parseICSToMeetings(
  icsContent: string,
  defaultCalendarName: string = '🏫 SchoolsBuddy'
): CalendarMeeting[] {
  const meetings: CalendarMeeting[] = [];

  // RFC 5545 line unfolding
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  // Extract calendar display name if present (e.g. X-WR-CALNAME:SchoolsBuddy)
  let detectedCalName = defaultCalendarName;
  for (const line of lines) {
    if (line.startsWith('X-WR-CALNAME:')) {
      const name = line.substring(13).trim();
      if (name) detectedCalName = name;
      break;
    }
  }

  let inEvent = false;
  let currentEvent: {
    uid?: string;
    summary?: string;
    dtstart?: string;
    dtend?: string;
    description?: string;
    location?: string;
  } = {};

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.dtstart) {
        const startParsed = parseIcsTimestamp(currentEvent.dtstart);
        if (startParsed && !isNaN(startParsed.date.getTime())) {
          const endParsed = currentEvent.dtend ? parseIcsTimestamp(currentEvent.dtend) : null;
          const isAllDay = startParsed.isAllDay;

          const title = (currentEvent.summary || '未命名學校行程')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\n/gi, ' ')
            .trim();

          const calName =
            detectedCalName.toLowerCase().includes('schoolsbuddy') ||
            (currentEvent.description || '').toLowerCase().includes('schoolsbuddy')
              ? '🏫 SchoolsBuddy'
              : detectedCalName;

          // If all-day event spanning multiple days (e.g. DTSTART:20261102 to DTEND:20261105)
          if (isAllDay && endParsed && endParsed.isAllDay) {
            const cur = new Date(startParsed.date);
            const endLimit = new Date(endParsed.date);
            // End date in iCal all-day events is exclusive; ensure at least 1 day
            const maxDays = Math.max(1, Math.round((endLimit.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24)));
            for (let d = 0; d < Math.min(30, maxDays); d++) {
              const dayDate = new Date(cur.getTime() + d * 86400000);
              const dateKey = toLocalDateKey(dayDate);
              meetings.push({
                id: `ics-${currentEvent.uid || Date.now()}-${d}`,
                title,
                startHour: 9,
                startMinute: 0,
                durationMinutes: 480,
                isAllDay: true,
                dateKey,
                isFridayAfterFour: false,
                source: 'synced',
                calendarName: calName,
                calendarColor: '#0F9D58',
              });
            }
          } else {
            // Standard timed meeting or single-day all day event
            const localDate = startParsed.date;
            const dateKey = toLocalDateKey(localDate);
            const startHour = isAllDay ? 9 : localDate.getHours();
            const startMinute = isAllDay ? 0 : localDate.getMinutes();
            let durationMinutes = isAllDay ? 480 : 60;

            if (!isAllDay && endParsed && !isNaN(endParsed.date.getTime())) {
              const diffMs = endParsed.date.getTime() - startParsed.date.getTime();
              if (diffMs > 0) {
                durationMinutes = Math.max(15, Math.round(diffMs / (1000 * 60)));
              }
            }

            const isFridayAfterFour =
              localDate.getDay() === 5 &&
              (startHour >= 16 || (startHour === 15 && startMinute >= 45));

            meetings.push({
              id: `ics-${currentEvent.uid || meetings.length + 1}-${Date.now()}`,
              title,
              startHour,
              startMinute,
              durationMinutes,
              isFridayAfterFour,
              dateKey,
              isAllDay,
              source: 'synced',
              calendarName: calName,
              calendarColor: '#0F9D58',
            });
          }
        }
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;

    if (line.startsWith('UID:')) {
      currentEvent.uid = line.substring(4).trim();
    } else if (line.startsWith('SUMMARY:')) {
      currentEvent.summary = line.substring(8);
    } else if (line.startsWith('DTSTART')) {
      currentEvent.dtstart = line;
    } else if (line.startsWith('DTEND')) {
      currentEvent.dtend = line;
    } else if (line.startsWith('DESCRIPTION:')) {
      currentEvent.description = line.substring(12);
    } else if (line.startsWith('LOCATION:')) {
      currentEvent.location = line.substring(9);
    }
  }

  meetings.sort((a, b) => {
    if ((a.dateKey || '') !== (b.dateKey || '')) {
      return (a.dateKey || '').localeCompare(b.dateKey || '');
    }
    return a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute);
  });

  return meetings;
}

/**
 * Parses Google Apps Script JSON array into CalendarMeeting[]
 */
export function parseJsonMeetings(data: any[], targetDate: Date = new Date()): CalendarMeeting[] {
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

    const eventDateKey =
      item.dateKey ||
      (item.start ? toLocalDateKey(new Date(item.start)) : toLocalDateKey(targetDate));

    const itemDate = parseLocalDateKey(eventDateKey);
    const isFridayAfterFour =
      itemDate.getDay() === 5 &&
      (startHour >= 16 || (startHour === 15 && startMinute >= 45));

    meetings.push({
      id: `live-json-${idx + 1}-${Date.now()}`,
      title: item.title || item.summary || '未命名會議',
      startHour,
      startMinute,
      durationMinutes,
      isFridayAfterFour,
      dateKey: eventDateKey,
      isAllDay: Boolean(item.isAllDay),
      source: 'synced',
      calendarName: item.calendarName,
      calendarColor: item.calendarColor,
    });
  });

  meetings.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  return meetings;
}

/**
 * Universal Live Calendar Feed Fetcher
 * Automatically detects and parses:
 * 1. SchoolsBuddy / iCal / webcal feeds (BEGIN:VCALENDAR)
 * 2. Google Apps Script JSON
 * With CORS proxy fallback for browser security restrictions.
 */
export async function fetchLiveCalendarFeed(
  rawUrl?: string,
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  const url =
    rawUrl?.trim() ||
    (typeof window !== 'undefined' ? localStorage.getItem('live_calendar_url') : null);

  if (!url) {
    throw new Error('請輸入日曆網址（支援 SchoolsBuddy、Google/Apple iCal 或 Apps Script）！');
  }

  // Normalize webcal:// to https://
  const cleanUrl = url.trim().replace(/^webcal:\/\//i, 'https://');

  let text = '';
  let fetchErrorMsg = '';

  // 1. Attempt direct fetch
  try {
    const res = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/calendar, application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      text = await res.text();
    } else {
      fetchErrorMsg = `HTTP ${res.status}`;
    }
  } catch (err: any) {
    fetchErrorMsg = err?.message || 'CORS 或連線中斷';
  }

  // 2. Fallback to CORS proxies if direct fetch was blocked (common in web browsers)
  if (!text) {
    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`,
    ];

    for (const proxy of proxyUrls) {
      try {
        const pRes = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
        if (pRes.ok) {
          const body = await pRes.text();
          if (body && (body.includes('BEGIN:VCALENDAR') || body.includes('[') || body.includes('{'))) {
            text = body;
            break;
          }
        }
      } catch {
        // try next proxy
      }
    }
  }

  if (!text) {
    throw new Error(`無法讀取日曆網址（${fetchErrorMsg}）。請確認網址正確且公開可用，或已授權學校/行事曆訂閱。`);
  }

  const isSchoolsBuddy = cleanUrl.toLowerCase().includes('schoolsbuddy');
  const defaultName = isSchoolsBuddy ? '🏫 SchoolsBuddy' : '🌐 訂閱日曆';

  // Format 1: iCalendar (.ics / webcal / SchoolsBuddy)
  if (text.includes('BEGIN:VCALENDAR') || text.includes('BEGIN:VEVENT')) {
    const meetings = parseICSToMeetings(text, defaultName);
    if (meetings.length === 0) {
      throw new Error('已連線至 iCal 日曆，但近期未發現任何有效行程。');
    }
    return meetings;
  }

  // Format 2: Google Apps Script JSON array
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return parseJsonMeetings(data, targetDate);
    }
  } catch {
    // not JSON
  }

  throw new Error('無法識別回傳的日曆格式，請確認是否為 SchoolsBuddy iCal 或 Google Apps Script JSON。');
}

/**
 * Backward compatibility alias for live JSON / Apps Script
 */
export async function fetchLiveJsonCalendarEvents(
  rawUrl?: string,
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  return fetchLiveCalendarFeed(rawUrl, targetDate);
}

/**
 * Backward compatibility: Lightweight iCal Parser for today
 */
export function parseICSForToday(icsContent: string, targetDate: Date = new Date()): CalendarMeeting[] {
  const all = parseICSToMeetings(icsContent);
  const targetKey = toLocalDateKey(targetDate);
  return all.filter((m) => m.dateKey === targetKey);
}

export async function fetchIcsWithCorsFallback(rawUrl: string, targetDate: Date = new Date()): Promise<CalendarMeeting[]> {
  return fetchLiveCalendarFeed(rawUrl, targetDate);
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

/**
 * ----------------------------------------------------
 * Custom Calendar Appointments (Create / Edit / Delete)
 * ----------------------------------------------------
 */

export interface CustomCalendarEvent {
  id: string;
  title: string;
  dateKey: string; // YYYY-MM-DD
  start?: string; // ISO 8601 string
  end?: string; // ISO 8601 string
  startHour: number; // 0-23
  startMinute: number; // 0-59
  durationMinutes: number;
  isAllDay: boolean;
  notes?: string;
  source: 'local';
  createdAt?: number;
  calendarName?: string;
  calendarColor?: string;
}

const CUSTOM_EVENTS_STORAGE_KEY = 'user_custom_events';

export function customEventToMeeting(e: CustomCalendarEvent): CalendarMeeting {
  const [y, m, d] = e.dateKey.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  const isFriday = dateObj.getDay() === 5;

  let sHour = e.startHour !== undefined ? e.startHour : 9;
  let sMin = e.startMinute !== undefined ? e.startMinute : 0;
  let dur = e.durationMinutes !== undefined ? e.durationMinutes : 60;

  if (e.start && !e.startHour) {
    const parsed = new Date(e.start);
    if (!isNaN(parsed.getTime())) {
      sHour = parsed.getHours();
      sMin = parsed.getMinutes();
    }
  }

  const isFridayAfterFour = isFriday && (sHour >= 16 || (sHour === 15 && sMin >= 45));

  return {
    id: e.id,
    title: e.title,
    startHour: sHour,
    startMinute: sMin,
    durationMinutes: e.isAllDay ? 480 : dur,
    isFridayAfterFour,
    dateKey: e.dateKey,
    notes: e.notes,
    isAllDay: e.isAllDay,
    source: 'local',
    calendarName: e.calendarName,
    calendarColor: e.calendarColor,
  };
}

export function getCustomEvents(): CustomCalendarEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomEvent(event: CustomCalendarEvent): void {
  if (typeof window === 'undefined') return;
  const events = getCustomEvents();
  const existingIdx = events.findIndex((e) => e.id === event.id);
  let updated: CustomCalendarEvent[];
  if (existingIdx >= 0) {
    updated = [...events];
    updated[existingIdx] = event;
  } else {
    updated = [event, ...events];
  }
  localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(updated));
}

export function deleteCustomEvent(id: string): void {
  if (typeof window === 'undefined') return;
  const events = getCustomEvents();
  const updated = events.filter((e) => e.id !== id);
  localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(updated));
}

export function getCustomEventsForDate(dateKey: string): CalendarMeeting[] {
  const events = getCustomEvents();
  return events
    .filter((e) => e.dateKey === dateKey)
    .map(customEventToMeeting)
    .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
}

/**
 * Merges external synced/preset meetings with user custom events for the target date
 */
export function getMergedEvents(
  syncedEvents: CalendarMeeting[] = [],
  targetDateKey: string
): CalendarMeeting[] {
  const customEvents = getCustomEventsForDate(targetDateKey);

  // Synced meetings: ONLY include if dateKey strictly matches targetDateKey!
  // This prevents yesterday's events (like Nov 1 flights) from leaking onto Nov 2.
  const relevantSynced = syncedEvents.filter((ev) => {
    if (ev.source === 'local') return false; // avoid duplicate
    if (ev.dateKey) return ev.dateKey === targetDateKey;
    return false;
  });

  const merged = [...relevantSynced, ...customEvents];
  merged.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  return merged;
}

/**
 * 2. Native Android / iOS Calendar Write via Capacitor
 */
export async function writeNativeDeviceCalendarEvent(event: {
  title: string;
  startDate: Date;
  endDate: Date;
  isAllDay?: boolean;
  notes?: string;
}): Promise<boolean> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  if (!isNative) return false;

  const win = window as any;
  if (win.Capacitor?.Plugins?.CapacitorCalendar) {
    try {
      const plugin = win.Capacitor.Plugins.CapacitorCalendar;
      if (plugin.requestWriteOnlyCalendarAccess) {
        await plugin.requestWriteOnlyCalendarAccess();
      } else if (plugin.requestFullCalendarAccess) {
        await plugin.requestFullCalendarAccess();
      }

      if (plugin.createEvent) {
        await plugin.createEvent({
          title: event.title,
          startDate: event.startDate.getTime(),
          endDate: event.endDate.getTime(),
          isAllDay: Boolean(event.isAllDay),
          notes: event.notes || '',
        });
        return true;
      }
    } catch (err) {
      console.warn('Native CapacitorCalendar.createEvent error:', err);
    }
  }

  // Also check if GanhuaWidgetBridge has write
  if (win.Capacitor?.Plugins?.GanhuaWidgetBridge?.createDeviceCalendarEvent) {
    try {
      await win.Capacitor.Plugins.GanhuaWidgetBridge.createDeviceCalendarEvent({
        title: event.title,
        startDate: event.startDate.getTime(),
        endDate: event.endDate.getTime(),
        isAllDay: Boolean(event.isAllDay),
      });
      return true;
    } catch (e) {
      console.warn('Bridge create event error:', e);
    }
  }

  return false;
}

export async function deleteNativeDeviceCalendarEvent(id: string): Promise<boolean> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform();

  if (!isNative) return false;
  const win = window as any;
  if (win.Capacitor?.Plugins?.CapacitorCalendar?.deleteEventById) {
    try {
      await win.Capacitor.Plugins.CapacitorCalendar.deleteEventById({ id });
      return true;
    } catch (e) {
      console.warn('Native delete error:', e);
    }
  }
  return false;
}

/**
 * 3. Push Event to Google Apps Script (Two-Way Sync Web Bridge)
 */
export async function pushEventToGoogleAppsScript(newEvent: {
  id: string;
  title: string;
  dateKey: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  isAllDay: boolean;
  notes?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const liveUrl = localStorage.getItem('live_calendar_url');
  if (!liveUrl) return false;

  try {
    await fetch(liveUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_event',
        id: newEvent.id,
        title: newEvent.title,
        date: newEvent.dateKey,
        startHour: newEvent.startHour,
        startMinute: newEvent.startMinute,
        durationMinutes: newEvent.durationMinutes,
        isAllDay: newEvent.isAllDay,
        notes: newEvent.notes || '',
      }),
    });
    return true;
  } catch (err) {
    console.warn('GAS push failed:', err);
    return false;
  }
}

