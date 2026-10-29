export interface CalendarMeeting {
  id: string;
  title: string;
  startHour: number; // 0-23
  startMinute: number;
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
}

export const MOCK_CALENDAR_PRESETS: {
  id: string;
  label: string;
  description: string;
  events: CalendarMeeting[];
}[] = [
  {
    id: 'heavy_hell',
    label: '💥 馬拉松開會地獄 (5場會議)',
    description: '從早開到晚，包含 16:30 週五進度週報',
    events: [
      { id: 'm1', title: '全體晨會 Standup', startHour: 9, startMinute: 30, durationMinutes: 45 },
      { id: 'm2', title: 'Q4 跨部門對齊會', startHour: 11, startMinute: 0, durationMinutes: 60 },
      { id: 'm3', title: '產品改版腦力激盪', startHour: 14, startMinute: 0, durationMinutes: 90 },
      { id: 'm4', title: '業績檢討復盤', startHour: 15, startMinute: 45, durationMinutes: 45 },
      { id: 'm5', title: '週五下班前進度同步', startHour: 16, startMinute: 30, durationMinutes: 60, isFridayAfterFour: true },
    ],
  },
  {
    id: 'friday_late',
    label: '💀 週五下午四點後的臨時會',
    description: '明明可以發 email，非要下班前抓人開會',
    events: [
      { id: 'm1', title: '午餐餐敘', startHour: 12, startMinute: 30, durationMinutes: 60 },
      { id: 'm2', title: '「順便聊一下」臨時緊急會', startHour: 16, startMinute: 30, durationMinutes: 75, isFridayAfterFour: true },
    ],
  },
  {
    id: 'peaceful_day',
    label: '✨ 奇蹟無會議日 (0場)',
    description: '行事曆一片空白，摸魚生存最高境界',
    events: [],
  },
  {
    id: 'moderate_day',
    label: '💼 一般社畜日常 (2場)',
    description: '上午一場，下午一場，勉強還能偷呼吸',
    events: [
      { id: 'm1', title: '專案每週進度會', startHour: 10, startMinute: 30, durationMinutes: 60 },
      { id: 'm2', title: '客戶需求澄清會', startHour: 15, startMinute: 0, durationMinutes: 60 },
    ],
  },
];

export function analyzeCalendarEvents(events: CalendarMeeting[]): CalendarRoastResult {
  const count = events.length;
  let totalMinutes = 0;
  let hasFridayLate = false;

  events.forEach((ev) => {
    totalMinutes += ev.durationMinutes;
    if (ev.isFridayAfterFour || (ev.startHour >= 16 && new Date().getDay() === 5)) {
      hasFridayLate = true;
    }
  });

  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const isBackToBack = count >= 4;

  if (hasFridayLate) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: true,
      hasBackToBackMeetings: isBackToBack,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${count} 場會議・偵測到週五致命末班會`,
      roastQuote: '週五下午四點後開會的人，靈魂注定得不到安息。',
      roastSubtext: `今天有 ${totalHours} 小時在會議室做功德，尤其是下班前的最後掙扎。`,
      yi: '假裝網路不順退出會議・眼神渙散點頭',
      ji: '在 17:00 認真問「請問還有其他事項嗎」',
    };
  }

  if (count >= 5 || totalHours >= 4.5) {
    return {
      meetingsCount: count,
      hasFridayLateMeeting: false,
      hasBackToBackMeetings: true,
      totalMeetingHours: totalHours,
      summaryBadge: `📅 今日 ${count} 場會議 (${totalHours}小時)：靈魂脫線模式`,
      roastQuote: '今天整天都在聽別人講廢話，自己一句有用的都沒做。',
      roastSubtext: `累積共 ${count} 場會議、${totalHours} 小時通靈時間，薪水是拿來買精神撫慰金的。`,
      yi: '開啟通話自動靜音・關掉攝影機打瞌睡',
      ji: '相信這場會能得出任何有建設性的結論',
    };
  }

  if (count >= 2) {
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
    };
  }

  return {
    meetingsCount: 0,
    hasFridayLateMeeting: false,
    hasBackToBackMeetings: false,
    totalMeetingHours: 0,
    summaryBadge: '📅 今日 0 場會議：神蹟般的空白行事曆',
    roastQuote: '今天行事曆居然沒會議，肯定是哪裡有詐。',
    roastSubtext: '沒有會議就是最好的會議，趁主管沒發現前靜靜地把薪水領走。',
    yi: '帶薪上廁所・安靜地當一塊沒用的爛泥',
    ji: '在群組問「今天大家好像很閒」',
  };
}

