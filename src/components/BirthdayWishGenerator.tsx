import React, { useState, useMemo } from 'react';
import { Copy, Check, Dices } from 'lucide-react';
import { playStampSound } from '../utils/soundEffects';

export interface BirthdayWishGeneratorProps {
  eventName: string;
  onShowToast?: (msg: string) => void;
  className?: string;
}

export interface BirthdayWishCategory {
  id: 'group' | 'work' | 'friend' | 'safe';
  title: string;
  badge: string;
  options: string[];
}

export const BIRTHDAY_WISH_CATEGORIES: BirthdayWishCategory[] = [
  {
    id: 'group',
    title: '群組省力跟風版',
    badge: '🤖 群組省力跟風版',
    options: [
      '生日快樂！！🎉🎂（已準時完成群組複製貼上任務）',
      '祝生日快樂🎉！雖然我是看行事曆通知才想起來的，但誠意滿分！',
      '生日快樂🎂！願你今天收到的祝福訊息，沒有一則是跟工作有關的！',
      '緊跟隊形！祝壽星生日快樂、身體健康、準時下班！🎉',
      '生日快樂！！🎊 願你的快樂像垃圾訊息一樣多，煩惱像我的存款一樣少！',
      '叮咚！您的年度敷衍但走心祝福已送達：祝生日快樂、事事順心🎂！',
      '生日快樂🎉！今天就不祝你步步高升了，祝你不用上班也有錢領！',
      '雖然只有短短四個字『生日快樂』，但已經耗盡我今日 80% 的社交電量了🎂！',
    ],
  },
  {
    id: 'work',
    title: '職場社畜同事版',
    badge: '💼 職場社畜同事版',
    options: [
      '生日快樂🎂！祝你今年會議少一點、薪水多一點、老闆離你遠一點！',
      '祝生日快樂！願你寫的案子永遠一稿過，客戶永遠閉嘴不改版！🎉',
      '生日快樂！祝你今年實現『已讀不回自由』與『準時打卡自由』！',
      '祝我們部門最堅強的社畜生日快樂🎂！願年終獎金厚到能砸暈老闆！',
      '生日快樂🎉！願你今天的電腦不會當機，信箱沒有急件，平安活到下班！',
      '祝生日快樂！願你的考績永遠特優，背鍋永遠輪不到你！🎂',
      '生日快樂！願你的咖啡永遠夠濃，開會永遠不用開鏡頭！🎉',
      '祝生日快樂🎂！希望明年這時候，我們都已經中樂透一起遞辭呈了！',
    ],
  },
  {
    id: 'friend',
    title: '損友厭世幹話版',
    badge: '🔥 損友厭世幹話版',
    options: [
      '祝你生日快樂🎉！雖然又老了一歲，但別難過，因為你明年會更老！',
      '生日快樂🎂！恭喜你離領勞保退休金的日子又邁進了一整年！',
      '祝你生日快樂！願你的髮際線永遠停留在二十歲，存款衝向八十歲！🎉',
      '生日快樂🎂！雖然歲月帶走了你的膠原蛋白，但至少留下了滿滿的體脂肪陪你！',
      '祝生日快樂！願你今年吃蛋糕都不會胖，買東西都不用看價錢！🎉',
      '又在地球上成功苟活了一整年，你的生命力真是令人敬佩！生日快樂🎂！',
      '生日快樂🎉！三個願望別浪費，建議三個都許『下禮拜一中威力彩頭獎』！',
      '祝你生日快樂🎂！到了這個年紀，最浪漫的祝福就是：祝你健檢報告沒有紅字！',
    ],
  },
  {
    id: 'safe',
    title: '體面百搭安全版',
    badge: '🥂 體面百搭安全版',
    options: [
      '生日快樂🎂！願新的一歲，有錢有閒、有吃有睡，日子過得比誰都滋潤！',
      '祝生日快樂🎉！願所有的美好與好運都如期而至，天天都有好心情！',
      '生日快樂！祝你新的一歲萬事順遂、財源廣進、吃飽睡好沒煩惱🎂！',
      '祝生日快樂🎊！願你忙有所得，閒有所樂，每天都能準時享受生活！',
      '生日快樂🎂！願新的一歲，眼裡有光、口袋有錢、身邊有愛！',
      '祝生日快樂！願你今年許下的所有願望，都能一個接一個排隊實現🎉！',
    ],
  },
];

export const BirthdayWishGenerator: React.FC<BirthdayWishGeneratorProps> = ({
  eventName,
  onShowToast,
  className = '',
}) => {
  // Store current index for each category
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    BIRTHDAY_WISH_CATEGORIES.forEach((cat) => {
      initial[cat.id] = Math.floor(Math.random() * cat.options.length);
    });
    return initial;
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Clean event title (e.g. remove "Birthday" or "生日" tags if desired, or keep as is)
  const cleanEventName = useMemo(() => {
    return eventName || '好友';
  }, [eventName]);

  // Roll fresh non-repetitive indices across all 4 categories
  const handleShuffleAll = () => {
    setSelectedIndices((prev) => {
      const next: Record<string, number> = {};
      BIRTHDAY_WISH_CATEGORIES.forEach((cat) => {
        const cur = prev[cat.id] ?? 0;
        let newIdx = Math.floor(Math.random() * cat.options.length);
        if (newIdx === cur && cat.options.length > 1) {
          newIdx = (cur + 1) % cat.options.length;
        }
        next[cat.id] = newIdx;
      });
      return next;
    });
    playStampSound();
    onShowToast?.('🎲 已隨機換一批 4 大風格祝賀詞！');
  };

  // Roll fresh index for single category
  const handleShuffleSingle = (catId: string, optionsCount: number) => {
    setSelectedIndices((prev) => {
      const cur = prev[catId] ?? 0;
      let newIdx = Math.floor(Math.random() * optionsCount);
      if (newIdx === cur && optionsCount > 1) {
        newIdx = (cur + 1) % optionsCount;
      }
      return {
        ...prev,
        [catId]: newIdx,
      };
    });
  };

  const handleCopy = async (text: string, catId: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      setCopiedId(catId);
      playStampSound();
      onShowToast?.('✓ 已複製壽星祝賀詞！可直接貼到通訊軟體');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      onShowToast?.('複製失敗，請手動複製文字');
    }
  };

  return (
    <div
      className={`rounded-2xl bg-[#FFF8EB] border-2 border-[#D4B483] p-3 sm:p-3.5 text-xs shadow-sm select-none animate-in fade-in space-y-2.5 ${className}`}
    >
      {/* Top Header Card */}
      <div className="flex items-center justify-between gap-2 border-b border-[#D4B483]/40 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">🎂</span>
          <div className="min-w-0">
            <h4 className="font-serif font-black text-xs sm:text-sm text-[#785A3C] truncate leading-tight">
              偵測到今日壽星：{cleanEventName}
            </h4>
            <p className="text-[10px] font-sans font-bold text-[#A67C52]">
              一鍵複製隨機祝賀詞（共 30 句精選幹話）
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShuffleAll}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF7F0] hover:bg-[#D4B483]/20 border border-[#D4B483] text-[#785A3C] text-[11px] font-sans font-bold shadow-2xs transition cursor-pointer active:scale-95 shrink-0"
          title="換一批 4 款隨機祝賀詞"
        >
          <Dices className="w-3.5 h-3.5 text-[#C83E31]" />
          <span>🎲 換一批祝賀詞</span>
        </button>
      </div>

      {/* 4 Category Preview Cards */}
      <div className="grid grid-cols-1 gap-2">
        {BIRTHDAY_WISH_CATEGORIES.map((cat) => {
          const index = selectedIndices[cat.id] ?? 0;
          const quoteText = cat.options[index] || cat.options[0];
          const isCopied = copiedId === cat.id;

          return (
            <div
              key={cat.id}
              className="rounded-xl bg-white border border-[#D4B483]/60 p-2.5 sm:p-3 space-y-1.5 transition hover:border-[#D4B483] hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-sans font-black px-2 py-0.5 rounded-md bg-[#FFF8EB] border border-[#D4B483]/80 text-[#785A3C] shrink-0">
                  {cat.badge}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleShuffleSingle(cat.id, cat.options.length)}
                    className="p-1 rounded-md text-[#A67C52] hover:text-[#785A3C] hover:bg-[#FFF8EB] transition cursor-pointer active:scale-95"
                    title={`換一句${cat.title}`}
                  >
                    <Dices className="w-3 h-3 text-[#A67C52]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(quoteText, cat.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans font-bold transition shadow-2xs cursor-pointer active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#2D2D2D] hover:bg-[#C83E31] text-[#FAF7F0]'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#D4B483]" />
                        <span>複製</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Exact Preview Quote */}
              <p className="font-serif font-black text-xs sm:text-[13px] text-[#2D2D2D] leading-snug pl-1 select-text">
                「{quoteText}」
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

