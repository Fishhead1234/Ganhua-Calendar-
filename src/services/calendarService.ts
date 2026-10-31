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
 * Mode C: 5 Interactive Test Preset Scenarios
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

/**
 * Intelligent Calendar Roast Analyzer
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

  // 1. Keyword: Performance Review / 1-on-1
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

  // 3. Monday morning meeting
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

  // 4. Meeting Hell: 5+ meetings or >= 4 hours
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

  // 5. Moderate meetings: 1-4 meetings
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

  // 6. Zero meetings: Slack off day
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
 * Mode A: Lightweight RFC 5545 iCalendar (.ics) Parser
 */
export function parseICSForToday(icsContent: string, targetDate: Date = new Date()): CalendarMeeting[] {
  const meetings: CalendarMeeting[] = [];

  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  // Normalize line folding (RFC 5545 lines starting with space or tab continue previous line)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let currentEvent: {
    summary?: string;
    dtstart?: string;
    dtend?: string;
  } = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.dtstart) {
        const parsedStart = parseIcsDateTime(currentEvent.dtstart);
        if (parsedStart) {
          if (
            parsedStart.getFullYear() === targetYear &&
            parsedStart.getMonth() === targetMonth &&
            parsedStart.getDate() === targetDay
          ) {
            let durationMinutes = 60;
            if (currentEvent.dtend) {
              const parsedEnd = parseIcsDateTime(currentEvent.dtend);
              if (parsedEnd) {
                durationMinutes = Math.max(
                  15,
                  Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60))
                );
              }
            }

            const startHour = parsedStart.getHours();
            const startMinute = parsedStart.getMinutes();
            const isFridayAfterFour =
              targetDate.getDay() === 5 &&
              (startHour >= 16 || (startHour === 15 && startMinute >= 45));

            meetings.push({
              id: `ics-${meetings.length + 1}-${Date.now()}`,
              title: currentEvent.summary || '未命名會議',
              startHour,
              startMinute,
              durationMinutes,
              isFridayAfterFour,
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
    } else if (line.startsWith('DTEND')) {
      const val = line.split(':')[1];
      if (val) currentEvent.dtend = val.trim();
    }
  }

  // Sort chronologically by start time
  meetings.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  return meetings;
}

function parseIcsDateTime(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 0;
  const minute = match[5] ? parseInt(match[5], 10) : 0;
  const second = match[6] ? parseInt(match[6], 10) : 0;
  const isUtc = Boolean(match[7]);

  if (isUtc) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Mode A: Fetch iCal (.ics) with multi-proxy fallback
 */
export async function fetchIcsWithCorsFallback(
  rawUrl: string,
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  const cleanUrl = rawUrl.trim().replace(/^webcal:\/\//i, 'https://');

  // Proxy 1: AllOrigins (Free, fast, widely allowed)
  try {
    const proxyUrl1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl1, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      if (text.includes('BEGIN:VCALENDAR')) {
        return parseICSForToday(text, targetDate);
      }
    }
  } catch (e) {
    console.warn('Proxy 1 (allorigins) failed:', e);
  }

  // Proxy 2: CorsProxy.io
  try {
    const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl2, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      if (text.includes('BEGIN:VCALENDAR')) {
        return parseICSForToday(text, targetDate);
      }
    }
  } catch (e) {
    console.warn('Proxy 2 (corsproxy.io) failed:', e);
  }

  // Direct fetch fallback (for local networks / CORS-enabled hosts)
  try {
    const res = await fetch(cleanUrl, { mode: 'cors', signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const text = await res.text();
      if (text.includes('BEGIN:VCALENDAR')) {
        return parseICSForToday(text, targetDate);
      }
    }
  } catch (e) {
    console.warn('Direct fetch failed due to CORS/Network:', e);
  }

  throw new Error(
    '無法讀取此 iCal 網址（可能受 Google CORS 封鎖或私密連結過期）。建議您直接將 .ics 檔案拖曳上傳，或使用 Google 帳號一鍵授權！'
  );
}

/**
 * Mode A: Parse local .ics file
 */
export async function parseIcsFile(file: File, targetDate: Date = new Date()): Promise<CalendarMeeting[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.includes('BEGIN:VCALENDAR')) {
          reject(new Error('上傳的檔案不是有效的 iCalendar (.ics) 格式'));
          return;
        }
        const meetings = parseICSForToday(text, targetDate);
        resolve(meetings);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}

/**
 * Mode B: Google Calendar API (OAuth Token Flow via GIS)
 */
declare global {
  interface Window {
    google?: any;
  }
}

export async function requestGoogleCalendarAccessToken(
  customClientId?: string
): Promise<string> {
  const clientId =
    customClientId?.trim() ||
    (typeof window !== 'undefined' ? localStorage.getItem('ganhua_google_client_id') : null);

  if (!clientId) {
    throw new Error(
      '請先輸入有效的 Google Cloud OAuth Client ID，或改用免設定的「🔗 iCal 訂閱連結」進行連動。'
    );
  }

  // 1. Ensure Google Identity Services SDK is loaded
  if (typeof window !== 'undefined' && !window.google?.accounts?.oauth2) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('無法載入 Google Identity Services SDK，請檢查網路連線。'));
      document.head.appendChild(script);
    });
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`Google 授權失敗: ${response.error_description || response.error}`));
            return;
          }
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('未取得 Google Access Token'));
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Mode B: Fetch today's events from Google Calendar REST API
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', startOfDay.toISOString());
  url.searchParams.set('timeMax', endOfDay.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Google 授權已過期，請重新點擊連動！');
    }
    throw new Error(`Google Calendar API 錯誤 (${res.status})`);
  }

  const data = await res.json();
  const items = data.items || [];

  const meetings: CalendarMeeting[] = [];

  items.forEach((item: any, idx: number) => {
    const startStr = item.start?.dateTime || item.start?.date;
    const endStr = item.end?.dateTime || item.end?.date;
    if (!startStr) return;

    const startDate = new Date(startStr);
    const endDate = endStr ? new Date(endStr) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const durationMinutes = Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)));

    const isFridayAfterFour =
      targetDate.getDay() === 5 &&
      (startHour >= 16 || (startHour === 15 && startMinute >= 45));

    meetings.push({
      id: item.id || `gcal-${idx + 1}`,
      title: item.summary || '未命名會議',
      startHour,
      startMinute,
      durationMinutes,
      isFridayAfterFour,
    });
  });

  return meetings;
}

