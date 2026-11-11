import { CharacterType, CalendarQuote, RawStaticQuote365 } from '../types/calendar';
import {
  toLocalDateKey,
  parseLocalDateKey,
  getDayOfYear,
  isSchoolRoastDayOfWeek,
} from '../utils/dateUtils';
import { formatQuoteFrom365 } from '../utils/quoteFormatter';
import quotes365Raw from '../data/quotes365.json';
import specialEventsQuotesData from '../data/special_events_quotes.json';

export const SCHOOL_PARENT_QUOTES = (specialEventsQuotesData as any[]).filter(
  (q) => q.eventType === 'school_parent'
);

export interface EventReminder {
  id: string;
  value: number; // e.g. 1, 15, 30, 2
  unit: 'minutes' | 'hours' | 'days';
}

export interface CalendarMeeting {
  id: string;
  title: string;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  durationMinutes: number;
  isFridayAfterFour?: boolean;
  dateKey?: string; // YYYY-MM-DD
  notes?: string;
  location?: string;
  isAllDay?: boolean;
  source?: 'local' | 'synced' | 'preset';
  calendarId?: string;
  calendarName?: string;
  calendarColor?: string;
  reminders?: EventReminder[];
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
  assetPath?: string;
  spriteSheet?: string;
  spritePosition?: string;
  eventType?: string;
  extractedName?: string;
}

/**
 * Extracts person's name from a birthday calendar event title.
 * Examples: "Yoo Jung's birthday" -> "Yoo Jung", "Tom's Bday" -> "Tom", "小明的生日" -> "小明"
 */
export function extractBirthdayPersonName(rawTitle: string): string {
  if (!rawTitle) return '壽星';
  let t = rawTitle.trim();
  // Remove leading "全天" / "整天" / "All Day" or brackets
  t = t.replace(/^(全天|整天|All\s*Day)\s*[:：\-]?\s*/i, '');
  t = t.replace(/^\[[^\]]+\]\s*/, '');

  // 1. "Name's Birthday" or "Name's bday"
  const possessiveMatch = t.match(/^([^'’]+)['’]s\s*(?:birthday|bday|生日|慶生)/i);
  if (possessiveMatch && possessiveMatch[1].trim()) {
    return possessiveMatch[1].trim();
  }

  // 2. "XXX的生日" or "XXX的慶生"
  const deMatch = t.match(/^([^的]+)的(?:生日|慶生|bday|birthday)/i);
  if (deMatch && deMatch[1].trim()) {
    return deMatch[1].trim();
  }

  // 3. "Birthday - Name" or "Birthday: Name" or "生日 - Name"
  const prefixMatch = t.match(/^(?:birthday|bday|生日|慶生)\s*[:：\-–—]\s*(.+)$/i);
  if (prefixMatch && prefixMatch[1].trim()) {
    return prefixMatch[1].trim();
  }

  // 4. "Name Birthday" or "Name bday" or "Name 生日" or "Name 慶生"
  const suffixMatch = t.match(/^(.+?)\s+(?:birthday|bday|生日|慶生)/i);
  if (suffixMatch && suffixMatch[1].trim()) {
    return suffixMatch[1].trim();
  }

  // 5. "帮/幫 XXX 慶生" or "祝 XXX 生日快樂"
  const wishMatch = t.match(/(?:幫|帮|祝|給|给)\s*([^\s,，!！~]+)\s*(?:慶生|過生日|生日)/i);
  if (wishMatch && wishMatch[1].trim()) {
    return wishMatch[1].trim();
  }

  // 6. Just contains "生日" or "birthday" without obvious prefix/suffix
  const stripped = t.replace(/(?:'s\s*)?(?:birthday|bday|生日|慶生|happy\s*birthday)/gi, '').trim();
  if (stripped && stripped.length <= 15) {
    return stripped;
  }

  return '壽星朋友';
}

/**
 * Checks whether the target date strictly equals the user's saved birthday (MM-DD)
 */
export function isUserOwnBirthday(
  targetDate: Date,
  userBirthday?: { month: number; day: number } | null
): boolean {
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const targetMMDD = `${m}-${d}`;

  if (userBirthday && typeof userBirthday.month === 'number' && typeof userBirthday.day === 'number') {
    const bdayMMDD = `${String(userBirthday.month).padStart(2, '0')}-${String(userBirthday.day).padStart(2, '0')}`;
    if (bdayMMDD === targetMMDD) return true;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('user_birthday');
      if (stored && stored.trim() === targetMMDD) {
        return true;
      }
      const persistedRaw = localStorage.getItem('ganhua_persisted_state_v1');
      if (persistedRaw) {
        const parsed = JSON.parse(persistedRaw);
        if (parsed?.birthday?.month && parsed?.birthday?.day) {
          const pMMDD = `${String(parsed.birthday.month).padStart(2, '0')}-${String(parsed.birthday.day).padStart(2, '0')}`;
          if (pMMDD === targetMMDD) return true;
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
}

export const OTHER_PERSON_BIRTHDAY_QUOTES = [
  {
    id: 'evt_other_bday_01',
    quote: '在群組排隊打『+1 生日快樂🎉』，是我對同事社交禮儀的最大極限。',
    subtext: '連貼圖都是挑最上面不用滑的那張，深怕多花一秒社交電量。',
    yi: '在群組跟風刷生日快樂・準時吃免費切片蛋糕',
    ji: '被拱主揪買禮物・自告奮勇上台唱生日快樂歌',
    character: 'cat' as CharacterType,
    sceneId: 'cat_fake_smile',
    spriteSheet: '/assets/sheets/cat_sheet.jpg',
    spritePosition: '50% 50%',
  },
  {
    id: 'evt_other_bday_02',
    quote: '別人生日最大的意義，就是辦公室茶水間終於有免費的下午茶蛋糕可以蹭。',
    subtext: '嘴裡吃著別人的蛋糕，心裡盤算著自己離退休金還有幾年。',
    yi: '精準出現在蛋糕分切現場・默默拿走最大塊水果蛋糕',
    ji: '為了分攤禮物錢認真打開網銀轉帳兩百元',
    character: 'capybara' as CharacterType,
    sceneId: 'capy_phone_scroll',
    spriteSheet: '/assets/sheets/capybara_sheet.jpg',
    spritePosition: '0% 50%',
  },
  {
    id: 'evt_other_bday_03',
    quote: '臉上掛著標準營業用假笑拍手唱生日歌，心裡只想著這場尷尬的儀式何時結束。',
    subtext: '社恐人的渡劫時刻：站在一群不熟的人中間拍手搖擺，靈魂已提前下班。',
    yi: '站在最外圍假裝熱情拍手・眼神放空裝忙',
    ji: '吹蠟燭時突然跟主管對到眼被點名發言致詞',
    character: 'ghost' as CharacterType,
    sceneId: 'ghost_umbrella_shield',
    spriteSheet: '/assets/sheets/ghost_sheet_2.jpg',
    spritePosition: '50% 0%',
  },
  {
    id: 'evt_other_bday_04',
    quote: '好朋友生日：送禮物心在淌血，但在卡片上寫滿損友毒舌是免費的。',
    subtext: '『恭喜你離入土又近了一年』—— 這是成年人最真摯且不花錢的祝福。',
    yi: '一鍵複製損友祝賀詞交差・拍照專挑對方的黑歷史醜照發限動',
    ji: '認真準備感人肺腑的長篇抒情文在群組肉麻',
    character: 'cat' as CharacterType,
    sceneId: 'cat_empty_wallet',
    spriteSheet: '/assets/sheets/cat_sheet.jpg',
    spritePosition: '0% 50%',
  },
];

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
export function analyzeCalendarEvents(
  events: CalendarMeeting[],
  presetId?: string,
  cycleIndex: number = 0,
  targetDate: Date = new Date()
): CalendarRoastResult {
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

  // 1. Separate timed meetings from all-day events
  // Exclude All-Day Events from work meeting hours and corporate meeting density calculation!
  const timedEvents = events.filter((e) => !e.isAllDay);
  const allDayEvents = events.filter((e) => !!e.isAllDay);

  let totalMinutes = 0;
  let hasFridayLate = false;
  let hasReviewOr1on1 = false;
  let hasAllHands = false;
  let hasEarlyMonday = false;
  let hasParentOrSchool = false;
  let hasOtherPersonBirthday = false;
  let otherPersonBirthdayTitle = '';
  let hasLessonOrMusic = false;
  let hasWedding = false;
  let hasDentistOrMedical = false;
  let hasFamilyDinner = false;
  let hasYearEndOrCompanyParty = false;

  const todayDay = targetDate.getDay();

  // Sum hours ONLY for timed meetings
  timedEvents.forEach((ev) => {
    totalMinutes += ev.durationMinutes || 0;
  });

  // Scan all events (both timed and all-day) for specific event keywords
  events.forEach((ev) => {
    const lowerTitle = (ev.title || '').toLowerCase();
    const lowerCalName = (ev.calendarName || '').toLowerCase();
    const combo = `${lowerTitle} ${lowerCalName}`;

    // Other Person's Birthday (e.g. "Yoo Jung's birthday", "Amy 生日", "慶生")
    if (
      combo.includes('birthday') ||
      combo.includes('bday') ||
      combo.includes('生日') ||
      combo.includes('慶生')
    ) {
      hasOtherPersonBirthday = true;
      if (!otherPersonBirthdayTitle) {
        otherPersonBirthdayTitle = ev.title || '';
      }
    }

    // Music / Cello / Piano / Talent Lessons
    if (
      combo.includes('cello') ||
      combo.includes('piano') ||
      combo.includes('lesson') ||
      combo.includes('才藝') ||
      combo.includes('音樂') ||
      combo.includes('大提琴') ||
      combo.includes('鋼琴') ||
      combo.includes('畫畫')
    ) {
      hasLessonOrMusic = true;
    }

    // School / Parent / Activities
    if (
      combo.includes('school') ||
      combo.includes('parent') ||
      combo.includes('家長') ||
      combo.includes('學校') ||
      combo.includes('班級') ||
      combo.includes('小孩') ||
      combo.includes('家長會') ||
      combo.includes('聯絡簿') ||
      combo.includes('接送') ||
      combo.includes('家長日') ||
      combo.includes('cross country') ||
      combo.includes('book club') ||
      combo.includes('football') ||
      combo.includes('u15') ||
      combo.includes('u18')
    ) {
      hasParentOrSchool = true;
    }

    // Wedding / 喜酒 / 紅色炸彈
    if (
      combo.includes('wedding') ||
      combo.includes('喜酒') ||
      combo.includes('婚禮') ||
      combo.includes('喜宴') ||
      combo.includes('紅色炸彈')
    ) {
      hasWedding = true;
    }

    // Dentist / Medical / Health check
    if (
      combo.includes('dentist') ||
      combo.includes('牙醫') ||
      combo.includes('看牙') ||
      combo.includes('洗牙') ||
      combo.includes('健檢') ||
      combo.includes('體檢') ||
      combo.includes('診所') ||
      combo.includes('醫院')
    ) {
      hasDentistOrMedical = true;
    }

    // Family Dinner
    if (
      combo.includes('family') ||
      combo.includes('家庭聚餐') ||
      combo.includes('家族') ||
      combo.includes('親戚') ||
      combo.includes('聚餐')
    ) {
      hasFamilyDinner = true;
    }

    // 1-on-1 / Review / 績效面談
    if (
      lowerTitle.includes('review') ||
      lowerTitle.includes('1-on-1') ||
      lowerTitle.includes('1:1') ||
      lowerTitle.includes('績效') ||
      lowerTitle.includes('考核') ||
      lowerTitle.includes('考績') ||
      lowerTitle.includes('面談')
    ) {
      hasReviewOr1on1 = true;
    }

    // Year-end / 尾牙 / 春酒
    if (
      combo.includes('尾牙') ||
      combo.includes('春酒') ||
      combo.includes('年會') ||
      combo.includes('company party')
    ) {
      hasYearEndOrCompanyParty = true;
    }

    // All Hands / Town Hall
    if (
      lowerTitle.includes('all hands') ||
      lowerTitle.includes('town hall') ||
      lowerTitle.includes('townhall') ||
      lowerTitle.includes('全體大會') ||
      lowerTitle.includes('公司大會')
    ) {
      hasAllHands = true;
    }

    // Friday Late Meeting (only for timed meetings on Friday after 16:00)
    if (!ev.isAllDay) {
      if (
        ev.isFridayAfterFour ||
        (todayDay === 5 && (ev.startHour >= 16 || (ev.startHour === 15 && ev.startMinute >= 45))) ||
        lowerTitle.includes('週五下班前') ||
        (todayDay === 5 && lowerTitle.includes('friday'))
      ) {
        hasFridayLate = true;
      }

      // Monday Early Meeting (only for timed meetings on Monday <= 9:00)
      if (
        (todayDay === 1 || lowerTitle.includes('週一') || lowerTitle.includes('monday')) &&
        ev.startHour <= 9
      ) {
        hasEarlyMonday = true;
      }
    }
  });

  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const timedCount = timedEvents.length;
  const isBackToBack = timedCount >= 4;

  // PRIORITY 1: Specific Event Keywords ALWAYS take precedence over Meeting Count!

  // 1-A. Friends / Colleagues' Birthday ("🎁 社交慶生營業模式")
  if (hasOtherPersonBirthday) {
    const extractedName = extractBirthdayPersonName(otherPersonBirthdayTitle);
    const badge = `🎁 社交慶生營業模式（偵測到壽星：${extractedName}）`;
    const bdayIndex =
      ((cycleIndex % OTHER_PERSON_BIRTHDAY_QUOTES.length) + OTHER_PERSON_BIRTHDAY_QUOTES.length) %
      OTHER_PERSON_BIRTHDAY_QUOTES.length;
    const selected = OTHER_PERSON_BIRTHDAY_QUOTES[bdayIndex];

    return {
      meetingsCount: events.length,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: totalHours,
      summaryBadge: badge,
      roastQuote: selected.quote,
      roastSubtext: selected.subtext,
      yi: selected.yi,
      ji: selected.ji,
      character: selected.character,
      sceneId: selected.sceneId,
      spriteSheet: selected.spriteSheet,
      spritePosition: selected.spritePosition,
      eventType: 'other_person_birthday',
      extractedName,
    };
  }

  // 1-C. School / Parent / Kids Activities / Lessons (Cycles through 10 quotes with different characters & poses)
  if (hasParentOrSchool || hasLessonOrMusic) {
    const schoolQuotes =
      SCHOOL_PARENT_QUOTES.length > 0
        ? SCHOOL_PARENT_QUOTES
        : [
            {
              quote: '下班不是自由的開始，而是小孩專屬司機兼活動贊助商的兼職開工。',
              subtext: '正職是社畜，兼職是隨傳隨到的私家車司機',
              character: 'cat' as CharacterType,
              sceneId: 'cat_sprint_home',
              spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
              spritePosition: '0% 0%',
              yi: '在車上安靜放空・偷吸手搖飲',
              ji: '問小孩今天在學校學了什麼',
              eventLabel: '🎒 小孩/學校活動行程',
            },
          ];

    const dayOfYear = getDayOfYear(targetDate);
    const schoolIndex =
      (((dayOfYear + cycleIndex) % schoolQuotes.length) + schoolQuotes.length) % schoolQuotes.length;
    const selected = schoolQuotes[schoolIndex];

    return {
      meetingsCount: events.length,
      hasFridayLateMeeting: hasFridayLate,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: selected.eventLabel || '🎒 小孩/學校活動行程',
      roastQuote: selected.quote,
      roastSubtext: selected.subtext,
      yi: selected.yi,
      ji: selected.ji,
      character: selected.character || 'cat',
      sceneId: selected.sceneId || 'cat_sprint_home',
      assetPath:
        selected.assetPath ||
        (selected.sceneId ? `/assets/scenes/${selected.sceneId}.webp` : undefined),
      spriteSheet: selected.spriteSheet || '/assets/sheets/cat_sheet_2.jpg',
      spritePosition: selected.spritePosition || '0% 0%',
      eventType: 'school_parent',
    };
  }

  // 1-D. Wedding / 喜酒
  if (hasWedding) {
    return {
      meetingsCount: events.length,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: totalHours,
      summaryBadge: '💣 偵測到【紅色炸彈/喜酒】專屬吐槽',
      roastQuote: '包出去的是禮金，收回來的是對愛情的懷疑與荷包的哀鳴。',
      roastSubtext: '週末特地早起梳化，只為了去吃一桌永遠吃不飽的花好月圓。',
      yi: '打包花好月圓炸湯圓・準時拿喜餅走人',
      ji: '被長輩問「什麼時候換你」認真回答',
      character: 'cat',
      sceneId: 'cat_red_envelope',
      spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
      spritePosition: '0% 100%',
    };
  }

  // 1-E. Dentist / Medical
  if (hasDentistOrMedical) {
    return {
      meetingsCount: events.length,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: totalHours,
      summaryBadge: '🏥 偵測到【進廠維修/看診】專屬吐槽',
      roastQuote: '聽到牙醫電鑽滋滋作響的那一刻，突然覺得上班好像也沒那麼痛苦了。',
      roastSubtext: '躺在診療椅上任人宰割，嘴巴張得比老闆畫的大餅還大。',
      yi: '乖乖漱口配合・深呼吸放鬆咬合肌',
      ji: '企圖跟戴著口罩拿著器械的醫生聊天辯論',
      character: 'cat',
      sceneId: 'cat_office_cold',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '50% 100%',
    };
  }

  // 1-F. Family Dinner
  if (hasFamilyDinner) {
    return {
      meetingsCount: events.length,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: totalHours,
      summaryBadge: '🍲 偵測到【家庭聚餐】專屬吐槽',
      roastQuote: '親戚聚餐的精髓：臉上笑嘻嘻，心裡默念三字經。',
      roastSubtext: '從小比成績，長大比薪水，老了比血壓。這不是吃飯，是靈魂拷問現場。',
      yi: '埋頭猛吃搶最後一塊肉・藉故上廁所滑手機',
      ji: '認真回答「最近公司年終發幾個月」',
      character: 'cat',
      sceneId: 'cat_empty_wallet',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '0% 50%',
    };
  }

  // 1-G. 1-on-1 / 績效面談
  if (hasReviewOr1on1) {
    return {
      meetingsCount: events.length,
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

  // 1-H. Year-end / 尾牙 / 春酒
  if (hasYearEndOrCompanyParty) {
    return {
      meetingsCount: events.length,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: totalHours,
      summaryBadge: '🍻 偵測到【公司尾牙/聚餐】專屬吐槽',
      roastQuote: '尾牙最大的獎項不是特獎十萬，而是老闆中途有事先走。',
      roastSubtext: '被迫看長官自嗨表演，敬酒還要排隊陪笑，這根本是帶薪受刑。',
      yi: '專心吃大蝦與龍蝦・抽完安慰獎直接開溜',
      ji: '喝醉跟大老闆勾肩搭背說真心話',
      character: 'cat',
      sceneId: 'cat_payday_king',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '0% 100%',
    };
  }

  // 1-I. Friday late afternoon meeting
  if (hasFridayLate) {
    return {
      meetingsCount: timedCount,
      hasFridayLateMeeting: true,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${timedCount} 場會議・偵測到週五致命末班會`,
      roastQuote: '週五下午四點後安排會議的人，下輩子走路會踢到桌腳。',
      roastSubtext: '明明可以用一封信講完的事，非要在週末前夕拉所有人陪葬。',
      yi: '假裝網路不順斷線退出・眼神渙散點頭',
      ji: '在 17:00 認真問「請問還有其他事項嗎」',
      character: 'cat',
      sceneId: 'cat_laptop_rage',
      spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
      spritePosition: '100% 0%',
    };
  }

  // 1-J. All Hands / 全體大會
  if (hasAllHands) {
    return {
      meetingsCount: timedCount,
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

  // 1-K. Monday morning meeting
  if (hasEarlyMonday) {
    return {
      meetingsCount: timedCount,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 週一早會 (${timedCount}場會議)：微弱電量掙扎中`,
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

  // PRIORITY 2: Meeting Hell: ONLY triggered when there are 4 or more timed meetings!
  // Dynamic count inserted: "今天有 ${timedCount} 個會"
  if (timedCount >= 4) {
    return {
      meetingsCount: timedCount,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: true,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${timedCount} 場會議 (${totalHours}小時)｜觸發【會議地獄】`,
      roastQuote: `今天有 ${timedCount} 個會。建議靈魂直接請假，留肉體在座位上點頭就好。`,
      roastSubtext: `累積共 ${timedCount} 場會議、${totalHours} 小時通靈時間，薪水是拿來買精神撫慰金的。`,
      yi: '開啟通話自動靜音・關掉攝影機打瞌睡',
      ji: '相信這場會能得出任何有建設性的結論',
      character: 'cat',
      sceneId: 'cat_meeting_loading',
      spriteSheet: '/assets/sheets/cat_sheet.jpg',
      spritePosition: '100% 50%',
    };
  }

  // PRIORITY 3: Moderate timed meetings: 1 to 3 meetings (Diverse quotes to prevent repetitive cat_coffee)
  if (timedCount >= 1) {
    const meetingQuotes = [
      {
        quote: '能用一封 Email 講完的事，非要拉大家通靈一小時。',
        subtext: `今日排程 ${timedCount} 場會議，社交電池已被榨乾到僅剩紅燈。`,
        sceneId: 'cat_coffee',
        character: 'cat' as CharacterType,
        spriteSheet: '/assets/sheets/cat_sheet.jpg',
        spritePosition: '0% 0%',
        yi: '準備滿杯冰美式・只回貼圖與收到',
        ji: '主動發言說「我來負責後續追蹤」',
      },
      {
        quote: '開會最大的產出，就是約定好下一次什麼時候再開會。',
        subtext: `排定 ${timedCount} 場會，只要會開得夠多，就永遠不用真正開始做事情。`,
        sceneId: 'capy_computer_blank',
        character: 'capybara' as CharacterType,
        spriteSheet: '/assets/sheets/capybara_sheet.jpg',
        spritePosition: '50% 0%',
        yi: '開雙螢幕假裝很忙・鏡頭前認真點頭',
        ji: '在靜音時忘記關麥克風嘆大氣',
      },
      {
        quote: '肉體端坐在會議室裡微笑，靈魂早已在下班的捷運上狂奔。',
        subtext: `今日 ${timedCount} 場會議，建議靈魂先下班，留肉體在座位上當人形立牌就好。`,
        sceneId: 'ghost_soul_exit',
        character: 'ghost' as CharacterType,
        spriteSheet: '/assets/sheets/ghost_sheet.jpg',
        spritePosition: '0% 100%',
        yi: '眼神失焦假裝深思熟慮・默默喝水消磨時間',
        ji: '被主席問「你有什麼想法」隨便亂答',
      },
      {
        quote: '今天這場會如果沒有我，地球依然會轉動，甚至轉得更快。',
        subtext: `今天 ${timedCount} 場會議，我在此時此刻唯一的作用，就是充當出席率的分子。`,
        sceneId: 'cat_meeting_loading',
        character: 'cat' as CharacterType,
        spriteSheet: '/assets/sheets/cat_sheet.jpg',
        spritePosition: '100% 50%',
        yi: '全程靜音當個安靜的美男子・準時按離開會議',
        ji: '認真做會議紀錄結果被指派全套 Action Items',
      },
    ];

    const dayOfYear = getDayOfYear(targetDate);
    const mIndex =
      (((dayOfYear + cycleIndex) % meetingQuotes.length) + meetingQuotes.length) %
      meetingQuotes.length;
    const selectedMeeting = meetingQuotes[mIndex];

    return {
      meetingsCount: timedCount,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${timedCount} 場會議 (${totalHours}小時)：微弱電量掙扎中`,
      roastQuote: selectedMeeting.quote,
      roastSubtext: selectedMeeting.subtext,
      yi: selectedMeeting.yi,
      ji: selectedMeeting.ji,
      character: selectedMeeting.character,
      sceneId: selectedMeeting.sceneId,
      spriteSheet: selectedMeeting.spriteSheet,
      spritePosition: selectedMeeting.spritePosition,
      eventType: 'meeting_density',
    };
  }

  // PRIORITY 4: All-day events only (0 timed meetings, 1+ all-day events)
  if (allDayEvents.length > 0) {
    const firstAllDay = allDayEvents[0];
    return {
      meetingsCount: 0,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: false,
      totalMeetingHours: 0,
      summaryBadge: `📅 今日全天活動【${firstAllDay.title || '全天行程'}】`,
      roastQuote: '行事曆掛著全天行程，代表今天我的靈魂屬於自己，工作訊息一概不讀不回。',
      roastSubtext: '全天活動已啟動，工作請自重，有事明天再說，沒事更不要找。',
      yi: '專心享受全日生活・放下工作手機',
      ji: '在休假日手癢打開公司 Slack / Teams',
      character: 'cat',
      sceneId: 'cat_sprint_home',
      spriteSheet: '/assets/sheets/cat_sheet_2.jpg',
      spritePosition: '0% 0%',
    };
  }

  // PRIORITY 5: Zero meetings (薪水小偷日)
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

export interface ResolveDayContentOptions {
  quotes?: RawStaticQuote365[];
  userBirthday?: { month: number; day: number } | null;
  selectedThemeFilter?: CharacterType | 'all';
  activePresetId?: string;
  isPro?: boolean;
  cycleIndex?: number;
  userCardMode?: 'roast' | 'original';
}

export interface ResolvedDayContent extends CalendarQuote {
  hasRoastOverride: boolean;
  roastBadge: string;
  meetingsCount: number;
  timedMeetingsCount: number;
  totalMeetingHours: number;
  extractedName?: string;
  roastAvailable?: boolean;
  availableRoastBadge?: string;
  canToggleRoast?: boolean;
  currentMode?: 'roast' | 'original';
}

/**
 * Single Unified Resolver Function for Daily Card, Monthly View & Android Widgets
 * Guarantees 100% identical quote, character, sprite sheet, position, yi, ji, and roast badge
 * for any given date and its day events across all views.
 */
export function resolveDayContent(
  targetDate: Date,
  dayEvents: CalendarMeeting[] = [],
  options: ResolveDayContentOptions = {}
): ResolvedDayContent {
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();
  const dateStr = toLocalDateKey(targetDate);

  // 1. Base 365 daily quote
  const list = (options.quotes && options.quotes.length > 0 ? options.quotes : quotes365Raw) as RawStaticQuote365[];
  const found = list.find((q) => q && q.month === targetMonth && q.day === targetDay) || list[0];
  const base = formatQuoteFrom365(found, targetDate);

  // Character theme override
  if (options.selectedThemeFilter && options.selectedThemeFilter !== 'all') {
    base.character = options.selectedThemeFilter;
    base.illustrationSvg = `${options.selectedThemeFilter}_svg`;
    base.spriteSheet = `/assets/sheets/${options.selectedThemeFilter}_sheet.jpg`;
  }

  const timedEvents = dayEvents.filter((e) => !e.isAllDay);

  // 2. User Birthday Check
  // STRICT RULE: ONLY trigger user birthday mode when the selected date strictly equals user's birthday!
  // NEVER trigger user's own birthday from calendar event titles!
  const isUserBirthday = isUserOwnBirthday(targetDate, options.userBirthday);
  if (isUserBirthday) {
    const char = base.character;
    return {
      ...base,
      id: `birthday-${dateStr}`,
      quote: '壽星最大！今天誰敢找我開會，我就把蛋糕砸在誰的簡報投影幕上。',
      subtext: '又老了一歲，但離退休金又近了一步。今日宜帶薪吃蛋糕、不宜回覆任何工作訊息。',
      lunarDate: '🎂 壽星避難日・今日特權最大',
      yi: '吃雙倍草莓蛋糕・準時下班人間蒸發・放空耍廢',
      ji: '在生日這天看公司群組・回覆同事「收到」・答應加班開會',
      character: char,
      sceneId: `${char}_birthday`,
      assetPath: `/assets/scenes/${char}_birthday.webp`,
      spriteSheet: `/assets/sheets/${char}_sheet.jpg`,
      spritePosition: '100% 100%',
      eventLabel: '🎂 本日壽星最大',
      eventType: 'birthday',
      hasRoastOverride: true,
      roastBadge: '🎂 本日壽星最大',
      roastAvailable: true,
      availableRoastBadge: '🎂 本日壽星最大',
      canToggleRoast: false,
      currentMode: 'roast',
      meetingsCount: dayEvents.length,
      timedMeetingsCount: timedEvents.length,
      totalMeetingHours: 0,
    };
  }

  // 3. Preset Scenario or Calendar Events Roast Override
  const hasEvents = dayEvents && dayEvents.length > 0;
  const hasPreset = Boolean(options.activePresetId);

  if (hasPreset || hasEvents) {
    const roast = analyzeCalendarEvents(dayEvents, options.activePresetId, options.cycleIndex || 0, targetDate);
    const activeSceneId = roast.sceneId || base.sceneId;
    const isOtherPersonBday = roast.eventType === 'other_person_birthday';
    const isSchoolEvent = roast.eventType === 'school_parent';

    // STRICT RULE: Never override main card for other person's birthday!
    // When someone else's birthday is on the calendar, keep normal daily quote and character illustration from quotes365.json
    if (isOtherPersonBday) {
      return {
        ...base,
        hasRoastOverride: false,
        roastBadge: '',
        eventLabel: undefined,
        roastAvailable: false,
        canToggleRoast: false,
        currentMode: 'original',
        meetingsCount: roast.meetingsCount,
        timedMeetingsCount: timedEvents.length,
        totalMeetingHours: roast.totalMeetingHours,
        extractedName: roast.extractedName,
        specialEventCandidatesCount: 1,
        specialEventIndex: 0,
      };
    }

    // Anti-Fatigue Rule:
    // Limit school roasts to Monday (1) and Thursday (4) (and weekend events if present).
    // On Tue, Wed, Fri, default to NOT overriding the main card (fallback to quotes365.json).
    const defaultShouldOverride = isSchoolEvent
      ? isSchoolRoastDayOfWeek(targetDate)
      : true;

    // Check user toggle preference (if user explicitly toggled between roast and original)
    const shouldOverride =
      options.userCardMode === 'original'
        ? false
        : options.userCardMode === 'roast'
        ? true
        : defaultShouldOverride;

    const totalSchoolCount = SCHOOL_PARENT_QUOTES.length || 10;
    const candidatesCount = isSchoolEvent
      ? totalSchoolCount
      : isOtherPersonBday
      ? 4
      : (roast.eventType === 'meeting_density' ? 4 : (base.specialEventCandidatesCount || 1));

    const dayOfYear = getDayOfYear(targetDate);
    const candidateIndex = isSchoolEvent
      ? ((((dayOfYear + (options.cycleIndex || 0)) % totalSchoolCount) + totalSchoolCount) % totalSchoolCount)
      : isOtherPersonBday
      ? ((((options.cycleIndex || 0) % 4) + 4) % 4)
      : (roast.eventType === 'meeting_density'
        ? ((((dayOfYear + (options.cycleIndex || 0)) % 4) + 4) % 4)
        : (base.specialEventIndex || 0));

    if (shouldOverride) {
      return {
        ...base,
        quote: roast.roastQuote,
        subtext: roast.roastSubtext,
        yi: roast.yi || base.yi,
        ji: roast.ji || base.ji,
        character: roast.character || base.character,
        sceneId: activeSceneId,
        assetPath: roast.assetPath || (activeSceneId ? `/assets/scenes/${activeSceneId}.webp` : base.assetPath),
        spriteSheet: roast.spriteSheet || base.spriteSheet,
        spritePosition: roast.spritePosition || base.spritePosition,
        eventLabel: roast.summaryBadge,
        eventType: roast.eventType,
        extractedName: roast.extractedName,
        specialEventCandidatesCount: candidatesCount,
        specialEventIndex: candidateIndex,
        hasRoastOverride: true,
        roastBadge: roast.summaryBadge,
        roastAvailable: true,
        availableRoastBadge: roast.summaryBadge,
        canToggleRoast: true,
        currentMode: 'roast',
        meetingsCount: roast.meetingsCount,
        timedMeetingsCount: timedEvents.length,
        totalMeetingHours: roast.totalMeetingHours,
      };
    } else {
      // Anti-fatigue fallback or user toggled to original: Keep normal daily quote & 54-pose illustration from quotes365.json
      return {
        ...base,
        hasRoastOverride: false,
        roastBadge: '',
        eventLabel: undefined,
        roastAvailable: true,
        availableRoastBadge: roast.summaryBadge,
        canToggleRoast: true,
        currentMode: 'original',
        meetingsCount: roast.meetingsCount,
        timedMeetingsCount: timedEvents.length,
        totalMeetingHours: roast.totalMeetingHours,
        extractedName: roast.extractedName,
        specialEventCandidatesCount: candidatesCount,
        specialEventIndex: candidateIndex,
      };
    }
  }

  // 4. Default clean 365 daily quote (no meetings)
  return {
    ...base,
    hasRoastOverride: false,
    roastBadge: '',
    meetingsCount: 0,
    timedMeetingsCount: 0,
    totalMeetingHours: 0,
    roastAvailable: false,
    canToggleRoast: false,
    currentMode: 'original',
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

  // 1. Try AndroidCalendarBridge first (Direct Native CalendarContract query without filters)
  if (win.AndroidCalendarBridge?.getCalendarsJson) {
    try {
      const jsonStr = win.AndroidCalendarBridge.getCalendarsJson();
      const list = JSON.parse(jsonStr || '[]');
      if (Array.isArray(list) && list.length > 0) {
        calendars = list.map((c: any) => {
          let name = c.name || c.title || '個人行事曆';
          const accountName = c.accountName || '';
          if (name.startsWith('http://') || name.startsWith('https://')) {
            name = `🌐 訂閱日曆 (${name.replace(/^https?:\/\//, '').split('/')[0]})`;
          }
          return {
            id: String(c.id),
            name,
            accountName,
            color: c.color || '#2D2D2D',
            isPrimary: Boolean(c.isPrimary),
          };
        });
      }
    } catch (e) {
      console.warn('AndroidCalendarBridge.getCalendarsJson error:', e);
    }
  }

  // 2. Try CapacitorCalendar if available
  if (calendars.length === 0 && win.Capacitor?.Plugins?.CapacitorCalendar?.listCalendars) {
    try {
      const res = await win.Capacitor.Plugins.CapacitorCalendar.listCalendars();
      const list = res.result || res.calendars || [];
      calendars = list.map((c: any) => {
        let name = c.name || c.title || '個人行事曆';
        const accountName = c.accountName || c.source || '';
        if (name.startsWith('http://') || name.startsWith('https://')) {
          name = `🌐 訂閱日曆 (${name.replace(/^https?:\/\//, '').split('/')[0]})`;
        }
        return {
          id: String(c.id),
          name,
          accountName,
          color: c.color || '#2D2D2D',
          isPrimary: Boolean(c.isPrimary),
        };
      });
    } catch (e) {
      console.warn('CapacitorCalendar.listCalendars error:', e);
    }
  }

  // 3. Try GanhuaWidgetBridge
  if (calendars.length === 0 && win.Capacitor?.Plugins?.GanhuaWidgetBridge?.listCalendars) {
    try {
      const res = await win.Capacitor.Plugins.GanhuaWidgetBridge.listCalendars();
      const list = res.calendars || [];
      calendars = list.map((c: any) => {
        let name = c.name || c.title || '個人行事曆';
        const accountName = c.accountName || '';
        if (name.startsWith('http://') || name.startsWith('https://')) {
          name = `🌐 訂閱日曆 (${name.replace(/^https?:\/\//, '').split('/')[0]})`;
        }
        return {
          id: String(c.id),
          name,
          accountName,
          color: c.color || '#2D2D2D',
          isPrimary: Boolean(c.isPrimary),
        };
      });
    } catch (e) {
      console.warn('GanhuaWidgetBridge.listCalendars error:', e);
    }
  }

  // 4. Fallback for Web browser preview / test
  if (calendars.length === 0) {
    calendars = [
      { id: 'cal_work', name: '工作會議 (Google Calendar)', accountName: 'work@company.com', color: '#4285F4', isPrimary: true },
      { id: 'cal_personal', name: '個人生活 (Personal)', accountName: 'user@gmail.com', color: '#0F9D58' },
      { id: 'cal_family', name: '家庭生活 (Family)', accountName: 'home@family.net', color: '#EA4335' },
      { id: 'cal_tasks', name: '待辦事項 (Tasks)', accountName: 'tasks@outlook.com', color: '#8E24AA' },
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

  // 1. Try AndroidCalendarBridge.getEventsInstancesJson first!
  // This queries CalendarContract.Instances across [startMs, endMs], expanding:
  // - Recurring weekly school events (Book Club, Cross Country, Football, U15 & U18)
  // - Subscribed .ics calendars and multi-source feeds
  // - All-day UTC midnight format so dates never shift!
  if (win.AndroidCalendarBridge?.getEventsInstancesJson) {
    try {
      const jsonStr = win.AndroidCalendarBridge.getEventsInstancesJson(
        startOfDay.getTime(),
        endOfDay.getTime()
      );
      const rawEvents: any[] = JSON.parse(jsonStr || '[]');
      if (Array.isArray(rawEvents) && rawEvents.length > 0) {
        const meetings: CalendarMeeting[] = rawEvents
          .filter((e) => isEventEnabled(e.calendarId))
          .map((e, idx) => {
            const rawCalId = e.calendarId;
            const calIdStr = rawCalId !== undefined && rawCalId !== null && String(rawCalId).trim() !== ''
              ? String(rawCalId)
              : undefined;
            const matchedCal = calIdStr ? calendarMap.get(calIdStr) : undefined;
            const calendarName = matchedCal?.name || e.calendarName || matchedCal?.accountName || '手機日曆';
            const calendarColor = matchedCal?.color || e.calendarColor || '#2D2D2D';

            return {
              id: String(e.id || `native-inst-${idx + 1}`),
              title: e.title || '未命名行程',
              startHour: Number(e.startHour ?? 9),
              startMinute: Number(e.startMinute ?? 0),
              durationMinutes: Number(e.durationMinutes ?? 60),
              isFridayAfterFour: Boolean(e.isFridayAfterFour),
              dateKey: e.dateKey,
              isAllDay: Boolean(e.isAllDay),
              source: 'synced' as const,
              calendarId: calIdStr,
              calendarName,
              calendarColor,
              notes: e.notes || undefined,
              location: e.location || undefined,
            };
          });

        meetings.sort((a, b) => {
          if ((a.dateKey || '') !== (b.dateKey || '')) {
            return (a.dateKey || '').localeCompare(b.dateKey || '');
          }
          return a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute);
        });

        return meetings;
      }
    } catch (e) {
      console.warn('AndroidCalendarBridge.getEventsInstancesJson error:', e);
    }
  }

  // 2. Try @ebarooni/capacitor-calendar if available in plugins
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
 * Supports Google Calendar ICS, Outlook, Apple iCal feeds, and any standard .ics URL.
 */
export function parseICSToMeetings(
  icsContent: string,
  defaultCalendarName: string = '🌐 外部訂閱日曆'
): CalendarMeeting[] {
  const meetings: CalendarMeeting[] = [];

  // RFC 5545 line unfolding
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  // Extract calendar display name if present (e.g. X-WR-CALNAME:...)
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

          const title = (currentEvent.summary || '未命名行程')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\n/gi, ' ')
            .trim();

          const calName = detectedCalName || '🌐 外部訂閱日曆';

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
                notes: currentEvent.description
                  ? currentEvent.description.replace(/\\,/g, ',').replace(/\\n/g, '\n').trim()
                  : undefined,
                location: currentEvent.location
                  ? currentEvent.location.replace(/\\,/g, ',').replace(/\\n/g, '\n').trim()
                  : undefined,
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
              id: `ics-${currentEvent.uid || `${dateKey}_${title.replace(/\s+/g, '_')}_${startHour}_${startMinute}`}`,
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
              notes: currentEvent.description
                ? currentEvent.description.replace(/\\,/g, ',').replace(/\\n/g, '\n').trim()
                : undefined,
              location: currentEvent.location
                ? currentEvent.location.replace(/\\,/g, ',').replace(/\\n/g, '\n').trim()
                : undefined,
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
      id: `live-json-${item.id || `${eventDateKey}_${(item.title || item.summary || 'meeting').replace(/\s+/g, '_')}_${startHour}_${startMinute}`}`,
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
      notes: item.notes || item.description || undefined,
      location: item.location || undefined,
    });
  });

  meetings.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  return meetings;
}

/**
 * Fetches and parses a single calendar URL (iCal, webcal, or JSON)
 * Uses native AndroidCalendarBridge.fetchIcsUrl on Android to bypass WebView CORS completely!
 */
export async function fetchSingleCalendarUrl(
  rawUrl: string,
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  const cleanUrl = rawUrl.trim().replace(/^webcal:\/\//i, 'https://');
  const win = typeof window !== 'undefined' ? (window as any) : {};
  let text = '';
  let fetchErrorMsg = '';

  // 1. On Android: Use native AndroidCalendarBridge.fetchIcsUrl to bypass WebView CORS!
  if (win.AndroidCalendarBridge?.fetchIcsUrl) {
    try {
      const nativeText = win.AndroidCalendarBridge.fetchIcsUrl(cleanUrl);
      if (nativeText && !nativeText.startsWith('ERROR:') && (nativeText.includes('BEGIN:VCALENDAR') || nativeText.includes('BEGIN:VEVENT') || nativeText.trim().startsWith('['))) {
        text = nativeText;
      } else if (nativeText && nativeText.startsWith('ERROR:')) {
        fetchErrorMsg = nativeText;
      }
    } catch (e: any) {
      console.warn('Native fetchIcsUrl exception:', e);
      fetchErrorMsg = e?.message || 'Native fetch error';
    }
  }

  // 2. Direct fetch (if not fetched by native bridge or on web)
  if (!text) {
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
  }

  // 3. Fallback to CORS proxies if direct fetch was blocked (common in web browsers)
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
    throw new Error(`無法讀取日曆網址（${cleanUrl} - ${fetchErrorMsg}）。請確認網址正確且公開可用。`);
  }

  const defaultName = '🌐 訂閱日曆';

  // Format 1: iCalendar (.ics / webcal)
  if (text.includes('BEGIN:VCALENDAR') || text.includes('BEGIN:VEVENT')) {
    const meetings = parseICSToMeetings(text, defaultName);
    if (meetings.length === 0) {
      throw new Error(`已連線至 iCal 日曆（${cleanUrl}），但近期未發現任何有效行程。`);
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

  throw new Error(`無法識別回傳的日曆格式（${cleanUrl}），請確認是否為標準 iCal (.ics) 或 Google Apps Script JSON。`);
}

/**
 * Universal Live Calendar Feed Fetcher
 * Supports linking MULTIPLE iCal / webcal / GAS URLs simultaneously.
 * Bypasses CORS via native AndroidCalendarBridge on mobile.
 */
export async function fetchLiveCalendarFeed(
  rawUrl?: string,
  targetDate: Date = new Date()
): Promise<CalendarMeeting[]> {
  const urlInput =
    rawUrl?.trim() ||
    (typeof window !== 'undefined' ? localStorage.getItem('live_calendar_url') : null);

  if (!urlInput) {
    throw new Error('請輸入日曆網址（支援 Google/Apple iCal、Outlook、.ics 或 Apps Script）！');
  }

  // Split multiple URLs separated by newline, comma, or semicolon
  const urls = urlInput
    .split(/[\r\n,;]+/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && !u.startsWith('#'));

  if (urls.length === 0) {
    throw new Error('請輸入有效的日曆網址！');
  }

  const allMeetings: CalendarMeeting[] = [];
  const seenKeys = new Set<string>();
  let lastError: any = null;
  let successCount = 0;

  for (const singleUrl of urls) {
    try {
      const meetings = await fetchSingleCalendarUrl(singleUrl, targetDate);
      successCount++;
      for (const m of meetings) {
        const key = `${m.dateKey || ''}_${m.title}_${m.startHour}_${m.startMinute}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allMeetings.push(m);
        }
      }
    } catch (err: any) {
      console.warn(`Failed to fetch calendar from ${singleUrl}:`, err);
      lastError = err;
    }
  }

  if (successCount === 0 && lastError) {
    throw lastError;
  }

  allMeetings.sort((a, b) => {
    if ((a.dateKey || '') !== (b.dateKey || '')) {
      return (a.dateKey || '').localeCompare(b.dateKey || '');
    }
    return a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute);
  });

  return allMeetings;
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
  location?: string;
  source: 'local';
  createdAt?: number;
  calendarName?: string;
  calendarColor?: string;
  reminders?: EventReminder[];
}

const CUSTOM_EVENTS_STORAGE_KEY = 'user_custom_events';

export function scheduleEventNotificationsViaBridge(event: CustomCalendarEvent): void {
  try {
    if (typeof window !== 'undefined' && (window as any).AndroidCalendarBridge?.scheduleEventNotifications) {
      (window as any).AndroidCalendarBridge.scheduleEventNotifications(JSON.stringify(event));
    }
  } catch (err) {
    console.warn('Failed to schedule event notifications via bridge:', err);
  }
}

export function cancelEventNotificationsViaBridge(eventId: string): void {
  try {
    if (typeof window !== 'undefined' && (window as any).AndroidCalendarBridge?.cancelEventNotifications) {
      (window as any).AndroidCalendarBridge.cancelEventNotifications(eventId);
    }
  } catch (err) {
    console.warn('Failed to cancel event notifications via bridge:', err);
  }
}

/**
 * Cancel and clear ALL scheduled calendar alarms & remove existing notifications
 */
export function cancelAllCalendarRemindersViaBridge(): void {
  try {
    if (typeof window !== 'undefined' && (window as any).AndroidCalendarBridge?.cancelAllEventNotifications) {
      (window as any).AndroidCalendarBridge.cancelAllEventNotifications();
    }
    if (typeof window !== 'undefined' && (window as any).AndroidCalendarBridge?.syncAllEventReminders) {
      (window as any).AndroidCalendarBridge.syncAllEventReminders('[]');
    }
  } catch (err) {
    console.warn('Failed to cancel all reminders via bridge:', err);
  }
}

/**
 * Sync and schedule reminders for ALL upcoming calendar events (Google / Outlook / iCal / Custom)
 */
export function syncAllCalendarRemindersViaBridge(meetings: CalendarMeeting[]): void {
  try {
    if (typeof window !== 'undefined' && (window as any).AndroidCalendarBridge?.syncAllEventReminders) {
      if (!meetings || meetings.length === 0) return;
      const todayKey = toLocalDateKey(new Date());
      // Filter upcoming events from today up to next 14 days
      const upcoming = meetings.filter((m) => !m.dateKey || m.dateKey >= todayKey);
      (window as any).AndroidCalendarBridge.syncAllEventReminders(JSON.stringify(upcoming));
    }
  } catch (err) {
    console.warn('Failed to sync all event reminders via bridge:', err);
  }
}

/**
 * Send an immediate test notification via native AlarmManager
 */
export function sendTestNotificationViaBridge(delaySeconds: number = 3): boolean {
  try {
    if (typeof window !== 'undefined' && (window as any).AndroidCalendarBridge?.sendTestNotification) {
      return (window as any).AndroidCalendarBridge.sendTestNotification(delaySeconds);
    }
  } catch (err) {
    console.warn('Failed to send test notification via bridge:', err);
  }
  return false;
}

/**
 * Open Android system settings to grant exact alarm permission on Android 12+ (API 31+)
 */
export function openExactAlarmSettingsViaBridge(): boolean {
  try {
    if (typeof window !== 'undefined' && (window as any).AndroidCalendarBridge?.openExactAlarmSettings) {
      return (window as any).AndroidCalendarBridge.openExactAlarmSettings();
    }
  } catch (err) {
    console.warn('Failed to open exact alarm settings:', err);
  }
  return false;
}

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
    location: e.location,
    isAllDay: e.isAllDay,
    source: 'local',
    calendarName: e.calendarName,
    calendarColor: e.calendarColor,
    reminders: e.reminders,
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

  // Sync to native Android AlarmManager
  scheduleEventNotificationsViaBridge(event);
}

export function deleteCustomEvent(id: string): void {
  if (typeof window === 'undefined') return;
  const events = getCustomEvents();
  const updated = events.filter((e) => e.id !== id);
  localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(updated));

  // Cancel native alarms
  cancelEventNotificationsViaBridge(id);
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

