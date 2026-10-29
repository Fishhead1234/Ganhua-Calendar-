import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sparkles,
  Flame,
  LayoutGrid,
  Square,
  Brush,
  Heart,
} from 'lucide-react';
import { CharacterType, CHARACTER_META } from '../types/calendar';

interface TopBarProps {
  selectedTheme: CharacterType | 'all';
  onSelectTheme: (theme: CharacterType | 'all') => void;
  streakCount: number;
  offWorkHour: number;
  onChangeOffWorkHour: (hour: number) => void;
  viewMode: 'single' | 'trio';
  onToggleViewMode: (mode: 'single' | 'trio') => void;
  artStyle: 'original' | 'svg';
  onToggleArtStyle: () => void;
  favoritesCount: number;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  selectedTheme,
  onSelectTheme,
  streakCount,
  offWorkHour,
  onChangeOffWorkHour,
  viewMode,
  onToggleViewMode,
  artStyle,
  onToggleArtStyle,
  favoritesCount,
  showFavoritesOnly,
  onToggleFavoritesOnly,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [editingOffHour, setEditingOffHour] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('zh-TW', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Compute playful office countdown status
  const getOfficeCountdownStatus = () => {
    const day = now.getDay();
    if (day === 0 || day === 6) {
      return {
        badge: '週末回血中',
        text: '週末禁止談論公事・靈魂充電中',
      };
    }

    const target = new Date(now);
    target.setHours(offWorkHour, 0, 0, 0);
    const diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) {
      return {
        badge: '已下班',
        text: '靈魂已自由・下班後訊息一律當沒看到',
      };
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (day === 5 && hours < 4) {
      return {
        badge: '週五倒數中',
        text: `離週末自由還有 ${hours} 小時 ${minutes} 分`,
      };
    }

    if (now.getHours() === 12) {
      return {
        badge: '午休避難中',
        text: `離下班還有 ${hours} 小時 ${minutes} 分`,
      };
    }

    return {
      badge: `${offWorkHour}:00 下班`,
      text: `離下班還有 ${hours} 小時 ${minutes} 分`,
    };
  };

  const status = getOfficeCountdownStatus();

  return (
    <header className="w-full border-b border-[#2D2D2D]/15 bg-[#F9F6F0]/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-2.5">
        {/* Row 1: Brand Title + Live Clock & Office Countdown + Survival Streak */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border-2 border-[#2D2D2D] bg-[#FAF7F0] flex items-center justify-center shadow-[2px_2px_0px_#2D2D2D]">
              <span className="font-serif font-black text-base tracking-tighter text-[#2D2D2D]">
                幹
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-black text-lg sm:text-xl tracking-wide text-[#2D2D2D]">
                  幹話日曆
                </h1>
                <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full border border-[#2D2D2D]/30 bg-[#FAF7F0] text-[#6E6A63]">
                  煦暖厭世曆
                </span>
              </div>
              <p className="text-[11px] font-sans text-[#6E6A63] hidden sm:block">
                每日一頁社畜生存指南・撕掉今天的厭世
              </p>
            </div>
          </div>

          {/* Center: Live Digital Clock + Playful Office Countdown */}
          <div className="flex items-center gap-2 bg-[#FAF7F0] border border-[#2D2D2D]/30 rounded-2xl px-3 py-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-[#2D2D2D] shrink-0" />
            <span className="font-mono font-bold text-sm sm:text-base tracking-tight text-[#2D2D2D]">
              {timeString}
            </span>
            <span className="text-[#2D2D2D]/25">|</span>
            {editingOffHour ? (
              <div className="flex items-center gap-1 text-xs font-sans">
                <span className="text-[#6E6A63]">下班時間:</span>
                {[17, 18, 19, 20].map((hr) => (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => {
                      onChangeOffWorkHour(hr);
                      setEditingOffHour(false);
                    }}
                    className={`px-1.5 py-0.5 rounded border text-[11px] font-bold cursor-pointer ${
                      offWorkHour === hr
                        ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D]'
                        : 'bg-white text-[#2D2D2D] border-[#2D2D2D]/20'
                    }`}
                  >
                    {hr}:00
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingOffHour(true)}
                title="點擊切換你的下班時間"
                className="text-left flex items-center gap-1.5 cursor-pointer group"
              >
                <span className="text-xs font-sans font-bold text-[#2D2D2D] group-hover:underline">
                  {status.text}
                </span>
                <span className="hidden md:inline-block text-[10px] font-sans px-1.5 py-0.5 rounded bg-[#2D2D2D]/10 text-[#2D2D2D] font-semibold">
                  {status.badge}
                </span>
              </button>
            )}
          </div>

          {/* Right: Survival Streak Pill + View Switcher */}
          <div className="flex items-center gap-2">
            <div
              title="累積平安下班打卡天數"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-[#C83E31]/40 bg-[#C83E31]/10 text-[#C83E31] text-xs font-sans font-bold"
            >
              <Flame className="w-3.5 h-3.5 fill-[#C83E31]" />
              <span>平安下班 {streakCount} 天</span>
            </div>

            <button
              type="button"
              onClick={() => onToggleViewMode(viewMode === 'single' ? 'trio' : 'single')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-sans font-bold transition cursor-pointer ${
                viewMode === 'trio'
                  ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D]'
                  : 'bg-[#FAF7F0] text-[#2D2D2D] border-[#2D2D2D]/30 hover:border-[#2D2D2D]'
              }`}
              title="切換「單張撕頁日曆」或「三角色木桌並排預覽」"
            >
              {viewMode === 'trio' ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>單張日曆</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>三張並排</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Theme Character Filter Pills + Art Style Toggle + Favorites */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#2D2D2D]/10">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => onSelectTheme('all')}
              className={`px-3 py-1 rounded-full text-xs font-sans font-bold border transition cursor-pointer whitespace-nowrap ${
                selectedTheme === 'all'
                  ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                  : 'bg-[#FAF7F0] text-[#6E6A63] border-[#2D2D2D]/20 hover:border-[#2D2D2D]/50'
              }`}
            >
              ✦ 全部角色
            </button>

            {(Object.keys(CHARACTER_META) as CharacterType[]).map((charKey) => {
              const meta = CHARACTER_META[charKey];
              const active = selectedTheme === charKey;
              return (
                <button
                  key={charKey}
                  type="button"
                  onClick={() => onSelectTheme(charKey)}
                  className={`px-3 py-1 rounded-full text-xs font-sans font-bold border transition cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D] shadow-sm'
                      : 'bg-[#FAF7F0] text-[#2D2D2D] border-[#2D2D2D]/20 hover:border-[#2D2D2D]/50'
                  }`}
                >
                  {meta.badge}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleFavoritesOnly}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans font-bold border transition cursor-pointer ${
                showFavoritesOnly
                  ? 'bg-[#C83E31] text-white border-[#C83E31]'
                  : 'bg-[#FAF7F0] text-[#6E6A63] border-[#2D2D2D]/20 hover:border-[#2D2D2D]/50'
              }`}
            >
              <Heart className={`w-3 h-3 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              <span>收藏 ({favoritesCount})</span>
            </button>

            <button
              type="button"
              onClick={onToggleArtStyle}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans font-bold border border-[#2D2D2D]/20 bg-[#FAF7F0] text-[#6E6A63] hover:text-[#2D2D2D] hover:border-[#2D2D2D]/50 transition cursor-pointer"
              title="切換原畫插圖或極簡向量手繪線條"
            >
              <Brush className="w-3 h-3" />
              <span>{artStyle === 'original' ? '畫風：文青原畫' : '畫風：極簡線條'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

