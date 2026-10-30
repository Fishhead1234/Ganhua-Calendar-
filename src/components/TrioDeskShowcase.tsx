import React from 'react';
import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { CharacterIllustration } from './CharacterIllustration';

interface TrioDeskShowcaseProps {
  quotes: CalendarQuote[];
  artStyle: 'original' | 'svg';
  onSelectCard: (quoteId: string) => void;
}

export const TrioDeskShowcase: React.FC<TrioDeskShowcaseProps> = ({
  quotes,
  artStyle,
  onSelectCard,
}) => {
  // Pick the 3 signature character cards (or first match per character)
  const catCard = quotes.find((q) => q.character === 'cat') || quotes[0];
  const capyCard = quotes.find((q) => q.character === 'capybara') || quotes[1];
  const ghostCard = quotes.find((q) => q.character === 'ghost') || quotes[2];

  const trio = [catCard, capyCard, ghostCard].filter(Boolean);

  return (
    <div className="w-full rounded-[32px] wood-desk-bg p-5 sm:p-8 shadow-xl border-2 border-[#2D2D2D]/20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-4xl mx-auto">
        {trio.map((card) => {
          const meta = CHARACTER_META[card.character];
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCard(card.id)}
              className="group text-left rounded-[26px] paper-texture border border-[#2D2D2D]/20 p-6 shadow-[0_12px_28px_rgba(35,22,10,0.28)] hover:-translate-y-1.5 transition-all duration-200 flex flex-col items-center justify-between min-h-[430px] cursor-pointer"
            >
              {/* Top Title */}
              <div className="text-center">
                <div className="font-serif font-black text-2xl tracking-[0.2em] text-[#2D2D2D]">
                  幹話日曆
                </div>
                <div className="text-[11px] font-sans text-[#6E6A63] mt-0.5">
                  {meta.nameZh} • {card.lunarDate}
                </div>
              </div>

              {/* Center Illustration */}
              <div className="w-full my-2">
                <CharacterIllustration
                  character={card.character}
                  artStyle={artStyle}
                  spriteSheet={card.spriteSheet}
                  spritePosition={card.spritePosition}
                  sceneId={card.sceneId}
                />
              </div>

              {/* Quote */}
              <div className="text-center space-y-3 w-full">
                <p className="font-serif font-black text-xl leading-relaxed text-[#2D2D2D]">
                  {card.quote}
                </p>
                <div className="pt-2 text-sm font-serif font-bold tracking-[0.22em] text-[#6E6A63]/75">
                  幹話日曆
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center mt-5">
        <div className="inline-block font-serif font-black text-2xl tracking-[0.22em] text-[#2D2D2D] drop-shadow-sm">
          幹話日曆
        </div>
        <p className="text-xs font-sans text-[#2D2D2D]/80 mt-1">
          點擊任一張日曆卡即可進入互動撕頁與打卡模式
        </p>
      </div>
    </div>
  );
};

