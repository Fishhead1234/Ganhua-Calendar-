import React, { useState } from 'react';
import { X, Download, Copy, Check, Share2, Sparkles } from 'lucide-react';
import { CalendarQuote, CHARACTER_META } from '../types/calendar';
import { CharacterIllustration, REFERENCE_CROP_MAP } from './CharacterIllustration';
import { parseQuoteDateDisplay } from './DeskCalendarCard';

interface IgStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: CalendarQuote;
  isSurvivedToday: boolean;
  streakCount: number;
  artStyle: 'original' | 'svg';
}

type StoryBgStyle = 'cream' | 'wood' | 'charcoal';

export const IgStoryModal: React.FC<IgStoryModalProps> = ({
  isOpen,
  onClose,
  quote,
  isSurvivedToday,
  streakCount,
  artStyle,
}) => {
  const [bgStyle, setBgStyle] = useState<StoryBgStyle>('wood');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);

  if (!isOpen) return null;

  const dateInfo = parseQuoteDateDisplay(quote.date);
  const charMeta = CHARACTER_META[quote.character];

  // High-resolution 1080x1920 9:16 Canvas generator for 1-click IG Story export
  const renderStoryCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw 9:16 Story Background
    if (bgStyle === 'wood') {
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, '#C6986A');
      grad.addColorStop(0.5, '#B38354');
      grad.addColorStop(1, '#9E6E40');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Subtle wood grain lines
      ctx.strokeStyle = 'rgba(72, 42, 16, 0.06)';
      ctx.lineWidth = 3;
      for (let x = 0; x < 1080; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1920);
        ctx.stroke();
      }
    } else if (bgStyle === 'charcoal') {
      ctx.fillStyle = '#232323';
      ctx.fillRect(0, 0, 1080, 1920);
    } else {
      ctx.fillStyle = '#EFE9DD';
      ctx.fillRect(0, 0, 1080, 1920);
    }

    // 2. Top Story Tag
    ctx.fillStyle = bgStyle === 'charcoal' ? '#F9F6F0' : '#2D2D2D';
    ctx.font = 'bold 30px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ 每日社畜生存日曆 ✦', 540, 155);

    // 3. Draw Main Cream Calendar Card (x=110, y=210, w=860, h=1440)
    const cardX = 110;
    const cardY = 210;
    const cardW = 860;
    const cardH = 1440;

    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(20, 15, 10, 0.32)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#FAF7F0';
    roundRect(ctx, cardX, cardY, cardW, cardH, 48);
    ctx.fill();
    ctx.restore();

    // Card border
    ctx.strokeStyle = '#2D2D2D';
    ctx.lineWidth = 5;
    roundRect(ctx, cardX, cardY, cardW, cardH, 48);
    ctx.stroke();

    // 4. Card Title "幹話日曆"
    ctx.fillStyle = '#2D2D2D';
    ctx.font = '900 56px "Noto Serif TC", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('幹 話 日 曆', 540, cardY + 115);

    // 5. Date Header Bar
    ctx.strokeStyle = '#2D2D2D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cardX + 60, cardY + 155);
    ctx.lineTo(cardX + cardW - 60, cardY + 155);
    ctx.moveTo(cardX + 60, cardY + 305);
    ctx.lineTo(cardX + cardW - 60, cardY + 305);
    ctx.stroke();

    // Month & Lunar left
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6E6A63';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`${dateInfo.monthEn} / ${dateInfo.monthZh}`, cardX + 80, cardY + 215);
    ctx.font = '500 26px "Noto Sans TC", sans-serif';
    ctx.fillText(quote.lunarDate, cardX + 80, cardY + 265);

    // Big Day Number center
    ctx.textAlign = 'center';
    ctx.fillStyle = dateInfo.isWeekend ? '#C83E31' : '#2D2D2D';
    ctx.font = '900 112px "Noto Serif TC", Georgia, serif';
    ctx.fillText(dateInfo.dayNumber, 540, cardY + 270);

    // Weekday & Character right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2D2D2D';
    ctx.font = 'bold 32px "Noto Serif TC", serif';
    ctx.fillText(dateInfo.weekdayZh, cardX + cardW - 80, cardY + 218);
    ctx.fillStyle = '#6E6A63';
    ctx.font = 'bold 25px "Noto Sans TC", sans-serif';
    ctx.fillText(charMeta.nameZh, cardX + cardW - 80, cardY + 265);

    // 6. Character Illustration from /characters/reference-trio.jpg
    try {
      const refImg = await loadImage('/characters/reference-trio.jpg');
      const crop = REFERENCE_CROP_MAP[quote.character];
      const destW = 540;
      const destH = 515;
      const destX = 540 - destW / 2;
      const destY = cardY + 340;
      ctx.drawImage(
        refImg,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        destX,
        destY,
        destW,
        destH
      );
    } catch {
      // Fallback text if image load fails
    }

    // 7. Quote Text (Wrapped nicely)
    ctx.fillStyle = '#2D2D2D';
    ctx.font = '900 50px "Noto Serif TC", Georgia, serif';
    ctx.textAlign = 'center';
    const quoteLines = wrapChineseText(quote.quote, 12);
    let qY = cardY + 950;
    quoteLines.forEach((line) => {
      ctx.fillText(line, 540, qY);
      qY += 72;
    });

    // Subtext
    ctx.fillStyle = '#6E6A63';
    ctx.font = '500 28px "Noto Sans TC", sans-serif';
    ctx.fillText(quote.subtext, 540, qY + 24);

    // 8. 宜 / 忌 Box
    const almY = cardY + 1165;
    ctx.fillStyle = '#F3EFE6';
    roundRect(ctx, cardX + 70, almY, cardW - 140, 130, 24);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2D2D2D';
    ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
    ctx.fillText(`【宜】${quote.yi}`, cardX + 105, almY + 52);
    ctx.fillStyle = '#C83E31';
    ctx.fillText(`【忌】${quote.ji}`, cardX + 105, almY + 98);

    // 9. Red Stamp if survived
    if (isSurvivedToday) {
      ctx.save();
      ctx.translate(cardX + cardW - 175, cardY + 820);
      ctx.rotate((-12 * Math.PI) / 180);
      ctx.strokeStyle = '#C83E31';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 88, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#C83E31';
      ctx.textAlign = 'center';
      ctx.font = '900 28px "Noto Serif TC", serif';
      ctx.fillText('今日已', 0, -8);
      ctx.fillText('平安下班', 0, 28);
      ctx.restore();
    }

    // 10. Card Watermark & Bottom Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6E6A63';
    ctx.font = 'bold 34px "Noto Serif TC", serif';
    ctx.fillText('幹 話 日 曆', 540, cardY + cardH - 55);

    ctx.fillStyle = bgStyle === 'charcoal' ? '#F9F6F0' : '#2D2D2D';
    ctx.font = 'bold 28px "Noto Sans TC", sans-serif';
    ctx.fillText(
      `🔥 連續平安下班 ${streakCount} 天 • #幹話日曆 #${charMeta.nameZh}`,
      540,
      1760
    );

    return canvas;
  };

  const handleDownloadStoryPng = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `幹話日曆_${quote.date}_${quote.character}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyStoryImage = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiedImg(true);
          setTimeout(() => setCopiedImg(false), 2500);
        } catch {
          // If clipboard image API restricted, fallback to download
          handleDownloadStoryPng();
        }
      }, 'image/png');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#F9F6F0] border-2 border-[#2D2D2D] shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#2D2D2D] text-[#F9F6F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#D4B483]" />
            <span className="font-serif font-bold text-sm tracking-wider">
              分享到 IG 限時動態 (9:16 預覽)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Background Theme Picker */}
          <div className="flex items-center justify-between gap-2 text-xs font-sans">
            <span className="font-bold text-[#6E6A63]">限動背景風格：</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'wood', label: '🪵 木桌質感' },
                { id: 'cream', label: '📜 煦暖米白' },
                { id: 'charcoal', label: '🖤 深夜極簡' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBgStyle(opt.id as StoryBgStyle)}
                  className={`px-2.5 py-1 rounded-full border font-bold cursor-pointer transition ${
                    bgStyle === opt.id
                      ? 'bg-[#2D2D2D] text-[#F9F6F0] border-[#2D2D2D]'
                      : 'bg-white text-[#2D2D2D] border-[#2D2D2D]/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 9:16 Vertical IG Story Preview Box */}
          <div
            className={`mx-auto w-[270px] aspect-[9/16] rounded-3xl p-4 flex flex-col items-center justify-between shadow-inner border border-[#2D2D2D]/25 relative overflow-hidden ${
              bgStyle === 'wood'
                ? 'wood-desk-bg'
                : bgStyle === 'charcoal'
                ? 'bg-[#232323]'
                : 'bg-[#EFE9DD]'
            }`}
          >
            <div
              className={`text-[10px] font-sans font-bold tracking-widest ${
                bgStyle === 'charcoal' ? 'text-[#F9F6F0]/80' : 'text-[#2D2D2D]/80'
              }`}
            >
              ✦ 每日社畜生存日曆 ✦
            </div>

            {/* Inner Calendar Card */}
            <div className="w-full flex-1 my-2 rounded-2xl paper-texture border-2 border-[#2D2D2D] p-3.5 flex flex-col justify-between shadow-lg relative">
              <div className="text-center">
                <div className="font-serif font-black text-base tracking-[0.2em] text-[#2D2D2D]">
                  幹話日曆
                </div>
                <div className="flex items-center justify-between border-y border-[#2D2D2D] py-1 mt-1 text-[10px] font-sans">
                  <span>
                    {dateInfo.monthEn} / {dateInfo.monthZh}
                  </span>
                  <span className="font-serif font-black text-xl text-[#2D2D2D]">
                    {dateInfo.dayNumber}
                  </span>
                  <span>{dateInfo.weekdayZh}</span>
                </div>
              </div>

              <div className="my-auto scale-90">
                <CharacterIllustration
                  character={quote.character}
                  artStyle={artStyle}
                  className="!h-36"
                />
              </div>

              {isSurvivedToday && (
                <div className="absolute right-2.5 bottom-16 -rotate-12 border-2 border-[#C83E31] bg-[#FAF7F0]/90 text-[#C83E31] rounded-full w-14 h-14 flex flex-col items-center justify-center text-[9px] font-serif font-black leading-tight shadow-sm">
                  <span>今日已</span>
                  <span>平安下班</span>
                </div>
              )}

              <div className="text-center space-y-1.5">
                <p className="font-serif font-black text-sm leading-snug text-[#2D2D2D]">
                  {quote.quote}
                </p>
                <div className="text-[10px] font-serif font-bold tracking-[0.2em] text-[#6E6A63]/80 pt-1">
                  幹話日曆
                </div>
              </div>
            </div>

            <div
              className={`text-[10px] font-sans font-bold ${
                bgStyle === 'charcoal' ? 'text-[#F9F6F0]/90' : 'text-[#2D2D2D]'
              }`}
            >
              🔥 連續平安下班 {streakCount} 天 • #{charMeta.nameZh}
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadStoryPng}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-[#2D2D2D] hover:bg-[#1a1a1a] text-[#F9F6F0] font-sans font-bold text-xs shadow cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '產生中...' : '下載 9:16 限動圖'}</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleCopyStoryImage}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl border-2 border-[#2D2D2D] bg-[#FAF7F0] hover:bg-[#F3EFE6] text-[#2D2D2D] font-sans font-bold text-xs cursor-pointer transition"
            >
              {copiedImg ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span className="text-emerald-700">已複製圖片！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>複製圖片貼上限動</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas helpers
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapChineseText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += maxCharsPerLine) {
    lines.push(text.slice(i, i + maxCharsPerLine));
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

