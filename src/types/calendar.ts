export type CharacterType = 'cat' | 'capybara' | 'ghost';

export type QuoteCategory = 'workplace' | 'laziness' | 'social_battery' | 'money' | 'seasonal' | 'layflat';

export interface RawStaticQuote365 {
  dayOfYear: number;
  dateKey: string;
  month: number;
  day: number;
  quote: string;
  subtext: string;
  character: CharacterType;
  theme: string;
  lunarDate?: string;
  yi?: string;
  ji?: string;
  sceneId?: string;
  assetPath?: string;
  spriteSheet?: string;
  spritePosition?: string;
}

export interface CalendarQuote {
  id: string;
  date: string; // YYYY-MM-DD
  month: number;
  day: number;
  quote: string;
  subtext: string;
  character: CharacterType;
  category: QuoteCategory;
  lunarDate: string;
  yi: string;
  ji: string;
  illustrationSvg: string;
  sceneId?: string;
  assetPath?: string;
  spriteSheet?: string;
  spritePosition?: string;
}

export interface CharacterMeta {
  id: CharacterType;
  nameZh: string;
  nameEn: string;
  badge: string;
  tagline: string;
  accentColor: string;
  bgTint: string;
}

export const CHARACTER_META: Record<CharacterType, CharacterMeta> = {
  cat: {
    id: 'cat',
    nameZh: '厭世社畜貓',
    nameEn: 'Burned-Out Office Cat',
    badge: '🐱 社畜貓',
    tagline: '歪領帶・冰美式・半瞇死魚眼',
    accentColor: '#785A3C',
    bgTint: '#F5EFE6',
  },
  capybara: {
    id: 'capybara',
    nameZh: '擺爛水豚',
    nameEn: 'Lay-Flat Capybara',
    badge: '🦫 擺爛水豚',
    tagline: '筆電旁融化成泥・情緒穩定擺爛',
    accentColor: '#8C6239',
    bgTint: '#F4EDE2',
  },
  ghost: {
    id: 'ghost',
    nameZh: '下班幽靈',
    nameEn: 'Off-Duty Ghost',
    badge: '👻 下班幽靈',
    tagline: '左手機械鍵盤・右手黑糖珍奶・靈魂已離線',
    accentColor: '#4A5568',
    bgTint: '#F1F2F4',
  },
};
