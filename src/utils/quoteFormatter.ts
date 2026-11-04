import {
  CalendarQuote,
  RawStaticQuote365,
  CharacterType,
  QuoteCategory,
} from '../types/calendar';
import { toLocalDateKey } from './dateUtils';

// Lunar date lookup helpers for authentic Taiwanese desk calendar feel
const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const YI_SAMPLES = [
  '喝大杯冰美式・準時打卡下班',
  '帶薪上廁所十五分鐘・安靜放空',
  '戴抗噪耳機裝忙・只回貼圖與收到',
  '點全糖黑糖珍奶・開啟勿擾模式',
  '把今天的工作留給明天的自己',
  '假裝在深入思考系統架構',
  '準時關機人間蒸發',
  '逛網購清空購物車・午休睡飽',
];

const JI_SAMPLES = [
  '在週五下午四點答應「順便開個會」',
  '認真打開銀行帳戶看存款餘額',
  '相信共體時艱與明年調薪大餅',
  '在下班前五分鐘主動問「還有事嗎」',
  '接聽沒有事先傳訊息預告的電話',
  '在週五下午五點進行正式環境部署',
  '睡前滑手機不小心點開公司群組',
  '相信「這場會只要十分鐘就結束」',
];

export function getFallbackLunarDate(targetDate: Date): string {
  const day = targetDate.getDate();
  const m = targetDate.getMonth();
  const lunarDay = LUNAR_DAYS[(day + 8) % 30];
  const lunarMonth = LUNAR_MONTHS[m % 12];
  return `農曆 ${lunarMonth}月${lunarDay}`;
}

export function formatQuoteFrom365(
  raw: RawStaticQuote365,
  dateObj: Date
): CalendarQuote {
  const dateStr = toLocalDateKey(dateObj);

  // Theme mapping to category
  let category: QuoteCategory = 'workplace';
  if (raw.theme === 'layflat' || raw.theme === 'laziness') category = 'laziness';
  else if (raw.theme === 'social_battery') category = 'social_battery';
  else if (raw.theme === 'money') category = 'money';
  else if (raw.theme === 'seasonal') category = 'seasonal';

  // Seeded pick for Yi / Ji based on day of year
  const seed = raw.dayOfYear || (raw.month * 31 + raw.day);
  const yi = raw.yi || YI_SAMPLES[seed % YI_SAMPLES.length];
  const ji = raw.ji || JI_SAMPLES[(seed + 3) % JI_SAMPLES.length];
  const lunarDate = raw.lunarDate || getFallbackLunarDate(dateObj);

  return {
    id: `q365-${raw.dateKey || `${raw.month}-${raw.day}`}`,
    date: dateStr,
    month: raw.month,
    day: raw.day,
    quote: raw.quote,
    subtext: raw.subtext,
    character: raw.character as CharacterType,
    category,
    lunarDate,
    yi,
    ji,
    illustrationSvg: `${raw.character}_svg`,
    sceneId: raw.sceneId,
    assetPath: raw.assetPath,
    spriteSheet: raw.spriteSheet || `/assets/sheets/${raw.character}_sheet.jpg`,
    spritePosition: raw.spritePosition || '0% 0%',
  };
}

