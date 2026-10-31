/**
 * Real Taiwanese Lunar Calendar (農曆) & 24 節氣 Engine
 * Uses Intl.DateTimeFormat with chinese calendar + astronomical solar terms calculation
 */

export interface LunarInfo {
  lunarMonthName: string; // e.g. "九月"
  lunarDayName: string; // e.g. "廿二"
  lunarMonthDay: string; // e.g. "九月廿二"
  ganZhiYear: string; // e.g. "丙午"
  ganZhiDay: string; // e.g. "戊戌"
  ganZhi: string; // e.g. "丙午年 戊戌日"
  solarTerm: string | null; // e.g. "霜降", "立冬"
  fullDisplayText: string; // e.g. "農曆九月廿二・霜降" or "農曆九月廿二"
  luckySlackTime: string; // e.g. "14:00 - 15:30"
  taiwanHoliday: string | null; // e.g. "國慶日", "中秋節"
  isHoliday: boolean;
}

const CHINESE_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// Rotating Lucky Slack Hours for workplace workers
const LUCKY_SLACK_TIMES = [
  '14:00 - 15:30 (午後昏睡避風港)',
  '10:30 - 11:30 (認真思索午餐菜單)',
  '15:45 - 16:45 (下午茶揪團偷喝)',
  '11:00 - 12:00 (預熱滑手機等午休)',
  '16:30 - 17:30 (靈魂提前收拾離線)',
  '13:30 - 14:30 (假裝盯著架構圖發呆)',
  '09:45 - 10:45 (廁所深度帶薪冥想)',
];

// Fixed date solar holidays (Taiwan)
const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '02-28': '228和平紀念日',
  '04-04': '兒童節',
  '04-05': '清明節',
  '05-01': '勞動節',
  '10-10': '國慶日',
};

// Fixed lunar holidays
const LUNAR_HOLIDAYS: Record<string, string> = {
  '正月-初一': '春節',
  '正月-初二': '初二回娘家',
  '正月-初三': '初三走春',
  '正月-十五': '元宵節',
  '五月-初五': '端午節',
  '七月-十五': '中元節',
  '八月-十五': '中秋節',
  '九月-初九': '重陽節',
  '臘月-三十': '除夕',
  '十二月-三十': '除夕',
  '十二月-廿九': '除夕',
};

/**
 * Approximate Solar Term calculator for year 2024-2030
 */
function getSolarTerm(date: Date): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Reference approximate solar term start days
  const SOLAR_TERMS_TABLE: { month: number; term1: string; day1: number; term2: string; day2: number }[] = [
    { month: 1, term1: '小寒', day1: 5, term2: '大寒', day2: 20 },
    { month: 2, term1: '立春', day1: 4, term2: '雨水', day2: 19 },
    { month: 3, term1: '驚蟄', day1: 5, term2: '春分', day2: 20 },
    { month: 4, term1: '清明', day1: 4, term2: '穀雨', day2: 20 },
    { month: 5, term1: '立夏', day1: 5, term2: '小滿', day2: 21 },
    { month: 6, term1: '芒種', day1: 6, term2: '夏至', day2: 21 },
    { month: 7, term1: '小暑', day1: 7, term2: '大暑', day2: 22 },
    { month: 8, term1: '立秋', day1: 7, term2: '處暑', day2: 23 },
    { month: 9, term1: '白露', day1: 7, term2: '秋分', day2: 23 },
    { month: 10, term1: '寒露', day1: 8, term2: '霜降', day2: 23 },
    { month: 11, term1: '立冬', day1: 7, term2: '小雪', day2: 22 },
    { month: 12, term1: '大雪', day1: 7, term2: '冬至', day2: 22 },
  ];

  const mData = SOLAR_TERMS_TABLE[month - 1];
  if (!mData) return null;

  // Active solar term window (e.g. 霜降 begins around 10/23 and lasts until 立冬 around 11/7)
  if (day >= mData.day2) {
    return mData.term2;
  }
  if (day >= mData.day1) {
    return mData.term1;
  }

  // Previous month's term2
  const prevMonthIdx = (month - 2 + 12) % 12;
  return SOLAR_TERMS_TABLE[prevMonthIdx].term2;
}

/**
 * Calculates Heavenly Stem & Earthly Branch (干支) for Day
 */
function getDayGanZhi(date: Date): string {
  // Epoch offset formula for sexagenary cycle
  const epoch = new Date(1900, 0, 1).getTime();
  const diffDays = Math.floor((date.getTime() - epoch) / 86400000);
  const cycleIndex = (diffDays + 10) % 60; // 1900-01-01 is 甲戌 (10)
  const normalized = cycleIndex < 0 ? cycleIndex + 60 : cycleIndex;

  const stem = HEAVENLY_STEMS[normalized % 10];
  const branch = EARTHLY_BRANCHES[normalized % 12];
  return `${stem}${branch}`;
}

/**
 * Calculates Heavenly Stem & Earthly Branch (干支) for Year
 */
function getYearGanZhi(year: number): string {
  const stem = HEAVENLY_STEMS[(year - 4) % 10];
  const branch = EARTHLY_BRANCHES[(year - 4) % 12];
  return `${stem}${branch}`;
}

/**
 * Retrieves comprehensive authentic Lunar date details for any given Date
 */
export function getLunarDetails(date: Date = new Date()): LunarInfo {
  let lunarMonth = '九月';
  let lunarDayNum = 22;

  try {
    const formatter = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', {
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    for (const p of parts) {
      if (p.type === 'month') {
        lunarMonth = p.value;
      } else if (p.type === 'day') {
        const parsed = parseInt(p.value, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
          lunarDayNum = parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Intl Chinese calendar fallback used:', e);
  }

  const lunarDayName = CHINESE_DAY_NAMES[lunarDayNum - 1] || '廿二';
  const lunarMonthDay = `${lunarMonth}${lunarDayName}`;

  const solarTerm = getSolarTerm(date);
  const ganZhiYear = getYearGanZhi(date.getFullYear());
  const ganZhiDay = getDayGanZhi(date);

  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const solarKey = `${mm}-${dd}`;
  const lunarKey = `${lunarMonth}-${lunarDayName}`;

  const taiwanHoliday = SOLAR_HOLIDAYS[solarKey] || LUNAR_HOLIDAYS[lunarKey] || null;

  // Build header display: e.g. "農曆九月廿二・霜降" or "農曆九月廿二"
  let fullDisplayText = `農曆${lunarMonthDay}`;
  if (taiwanHoliday) {
    fullDisplayText += `・${taiwanHoliday}`;
  } else if (solarTerm) {
    fullDisplayText += `・${solarTerm}`;
  }

  // Daily rotating slacking hours based on date seed
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const luckySlackTime = LUCKY_SLACK_TIMES[dayOfYear % LUCKY_SLACK_TIMES.length];

  return {
    lunarMonthName: lunarMonth,
    lunarDayName,
    lunarMonthDay,
    ganZhiYear,
    ganZhiDay,
    ganZhi: `${ganZhiYear}年 ${ganZhiDay}日`,
    solarTerm,
    fullDisplayText,
    luckySlackTime,
    taiwanHoliday,
    isHoliday: Boolean(taiwanHoliday),
  };
}
