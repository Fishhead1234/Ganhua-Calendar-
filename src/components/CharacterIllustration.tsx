import React, { useState, useEffect } from 'react';
import { CharacterType } from '../types/calendar';

export interface CharacterIllustrationProps {
  character: CharacterType;
  variant?: string;
  artStyle?: 'original' | 'svg';
  className?: string;
  compact?: boolean;
  spriteSheet?: string;
  spritePosition?: string;
  sceneId?: string;
  assetPath?: string;
}

export const REFERENCE_CROP_MAP: Record<
  CharacterType,
  { sx: number; sy: number; sw: number; sh: number; bgPos: string; bgSize: string }
> = {
  cat: {
    sx: 60,
    sy: 215,
    sw: 266,
    sh: 256,
    bgPos: '0% 0%',
    bgSize: '300% 300%',
  },
  capybara: {
    sx: 374,
    sy: 215,
    sw: 276,
    sh: 256,
    bgPos: '0% 0%',
    bgSize: '300% 300%',
  },
  ghost: {
    sx: 696,
    sy: 215,
    sw: 266,
    sh: 256,
    bgPos: '0% 0%',
    bgSize: '300% 300%',
  },
};

export const CharacterIllustration: React.FC<CharacterIllustrationProps> = ({
  character,
  artStyle = 'original',
  className = '',
  compact = false,
  spriteSheet,
  spritePosition,
  sceneId,
  assetPath,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [sceneId, assetPath]);

  if (artStyle === 'original') {
    // Priority 1: High-res perfectly centered, isolated scene image (WebP or PNG)
    const sceneFile = assetPath || (sceneId ? `/assets/scenes/${sceneId}.webp` : null);

    if (sceneFile && !imgError) {
      return (
        <div
          className={`relative overflow-hidden select-none flex items-center justify-center ${
            compact ? 'w-20 h-20' : 'w-full'
          } ${className}`}
        >
          <img
            src={sceneFile}
            alt={sceneId || `${character}_scene`}
            className={`${
              compact ? 'w-16 h-16 rounded-lg' : 'w-56 h-56 rounded-xl'
            } mx-auto object-contain mix-blend-multiply transition-all duration-300 drop-shadow-sm`}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      );
    }

    // Fallback: 3x3 Sprite Sheet
    const sheet = spriteSheet || `/assets/sheets/${character}_sheet.jpg`;
    const position = spritePosition || '0% 0%';

    return (
      <div
        className={`relative overflow-hidden select-none flex items-center justify-center ${
          compact ? 'w-20 h-20' : 'w-full'
        } ${className}`}
      >
        <div
          className={`${
            compact ? 'w-16 h-16 rounded-lg' : 'w-56 h-56 rounded-xl'
          } mx-auto bg-no-repeat transition-all duration-300 overflow-hidden mix-blend-multiply`}
          style={{
            backgroundImage: `url(${sheet})`,
            backgroundSize: '300% 300%',
            backgroundPosition: position,
          }}
          aria-label={sceneId || `${character}_pose`}
        />
      </div>
    );
  }

  // Hand-drawn Ink Line-Art SVG Mode
  return (
    <div
      className={`relative flex items-center justify-center select-none ${
        compact ? 'w-20 h-20' : 'w-full h-52 sm:h-56'
      } ${className}`}
    >
      {character === 'cat' && <OfficeCatSvg compact={compact} />}
      {character === 'capybara' && <LayFlatCapybaraSvg compact={compact} />}
      {character === 'ghost' && <OffDutyGhostSvg compact={compact} />}
    </div>
  );
};

const OfficeCatSvg: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <svg
    viewBox="0 0 280 230"
    className={compact ? 'w-20 h-20' : 'w-60 h-48'}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Office Chair Back */}
    <path
      d="M192 92 C222 92, 232 135, 226 175 L195 175"
      fill="#9E9082"
      fillOpacity="0.45"
      stroke="#2D2D2D"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Cat Ears & Head */}
    <path
      d="M95 85 L84 42 L118 65 Q140 60 162 65 L195 42 L185 85 C200 104, 198 134, 185 144 L198 175 L82 175 L95 144 C82 134, 80 104, 95 85 Z"
      fill="#FAF7F0"
      stroke="#2D2D2D"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    {/* Calico Ear Patches */}
    <path d="M86 46 L112 64 L95 82 Z" fill="#C9A882" opacity="0.65" />
    <path d="M193 46 L166 64 L184 82 Z" fill="#C9A882" opacity="0.65" />
    {/* Half-lidded Burned-Out Eyes */}
    <ellipse cx="118" cy="103" rx="13" ry="8" fill="#FAF7F0" stroke="#2D2D2D" strokeWidth="2.2" />
    <line x1="104" y1="101" x2="132" y2="101" stroke="#2D2D2D" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="118" cy="105" r="2.8" fill="#2D2D2D" />

    <ellipse cx="162" cy="103" rx="13" ry="8" fill="#FAF7F0" stroke="#2D2D2D" strokeWidth="2.2" />
    <line x1="148" y1="101" x2="176" y2="101" stroke="#2D2D2D" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="162" cy="105" r="2.8" fill="#2D2D2D" />

    {/* Whiskers */}
    <line x1="68" y1="106" x2="88" y2="109" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="66" y1="116" x2="87" y2="116" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="192" y1="109" x2="212" y2="106" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="193" y1="116" x2="214" y2="116" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round" />

    {/* Frowning Mouth */}
    <polygon points="140,113 136,118 144,118" fill="#2D2D2D" />
    <path d="M140 118 L134 125 M140 118 L146 125" stroke="#2D2D2D" strokeWidth="2.2" strokeLinecap="round" />

    {/* Shirt Collar & Crooked Tie */}
    <path d="M110 140 L135 156 L140 146 L145 156 L170 140" stroke="#2D2D2D" strokeWidth="2.3" fill="none" />
    <path
      d="M136 152 L126 184 L138 194 L149 182 L144 152 Z"
      fill="#B89778"
      stroke="#2D2D2D"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />

    {/* Iced Americano Cup with Straw */}
    <path d="M132 122 L114 114 L96 146" stroke="#2D2D2D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="74" y="138" width="34" height="44" rx="4" fill="#FAF7F0" stroke="#2D2D2D" strokeWidth="2.3" />
    <rect x="78" y="149" width="26" height="30" rx="2" fill="#6F4E37" fillOpacity="0.82" />
    <rect x="82" y="153" width="7" height="6" rx="1" fill="#FAF7F0" stroke="#2D2D2D" strokeWidth="1.3" />
    <rect x="92" y="156" width="7" height="6" rx="1" fill="#FAF7F0" stroke="#2D2D2D" strokeWidth="1.3" />

    {/* Desk Line & Scattered Papers */}
    <line x1="25" y1="184" x2="255" y2="184" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round" />
    <polygon
      points="95,184 148,184 136,212 80,208"
      fill="#FAF7F0"
      stroke="#2D2D2D"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line x1="175" y1="196" x2="206" y2="190" stroke="#2D2D2D" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const LayFlatCapybaraSvg: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <svg
    viewBox="0 0 280 230"
    className={compact ? 'w-20 h-20' : 'w-60 h-48'}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Desk Surface (3D perspective) */}
    <polygon
      points="24,148 225,134 258,158 55,178"
      fill="#FAF7F0"
      stroke="#2D2D2D"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <line x1="36" y1="156" x2="36" y2="205" stroke="#2D2D2D" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="215" y1="164" x2="215" y2="212" stroke="#2D2D2D" strokeWidth="2.4" strokeLinecap="round" />

    {/* Melted Capybara Body */}
    <path
      d="M105 130 C95 102, 128 84, 152 94 C178 86, 224 96, 232 136 L142 146 L118 152 C110 153, 102 145, 105 130 Z"
      fill="#C69C72"
      stroke="#2D2D2D"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Capybara Ear */}
    <ellipse cx="148" cy="92" rx="7" ry="5" transform="rotate(-20 148 92)" fill="#9C744F" stroke="#2D2D2D" strokeWidth="2.2" />
    {/* Closed Sleepy Eye & Snout */}
    <path d="M126 112 Q133 116 139 111" stroke="#2D2D2D" strokeWidth="2.4" strokeLinecap="round" />
    <ellipse cx="108" cy="122" rx="8" ry="11" fill="#A67B5B" opacity="0.65" />
    <circle cx="108" cy="118" r="2" fill="#2D2D2D" />

    {/* Open Laptop */}
    <polygon
      points="56,105 96,112 102,148 62,140"
      fill="#E5E0D5"
      stroke="#2D2D2D"
      strokeWidth="2.3"
      strokeLinejoin="round"
    />
    <polygon
      points="62,140 102,148 122,141 84,134"
      fill="#FAF7F0"
      stroke="#2D2D2D"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <circle cx="80" cy="126" r="4.5" stroke="#2D2D2D" strokeWidth="1.8" />

    {/* Coffee Cup on Desk */}
    <rect x="164" y="138" width="22" height="24" rx="4" fill="#FAF7F0" stroke="#2D2D2D" strokeWidth="2.2" />
    <rect x="166" y="145" width="18" height="10" fill="#8C6239" />
  </svg>
);

const OffDutyGhostSvg: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <svg
    viewBox="0 0 280 230"
    className={compact ? 'w-20 h-20' : 'w-60 h-48'}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Subtle Floor Shadow */}
    <ellipse cx="145" cy="198" rx="52" ry="9" fill="#2D2D2D" fillOpacity="0.12" />
    {/* Tiny Ghost Legs */}
    <path d="M132 176 L130 194 L122 195" stroke="#2D2D2D" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M158 176 L160 194 L168 195" stroke="#2D2D2D" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* Ghost Sheet Body */}
    <path
      d="M102 95 C102 52, 184 52, 184 95 L198 168 C192 174, 182 164, 174 172 C164 180, 154 168, 144 175 C134 180, 122 168, 112 174 C104 178, 94 170, 92 164 Z"
      fill="#FAF7F0"
      stroke="#2D2D2D"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />

    {/* Cute Blank Ghost Eyes & Tiny Dot Mouth */}
    <ellipse cx="129" cy="96" rx="4.2" ry="6" fill="#2D2D2D" />
    <ellipse cx="155" cy="96" rx="4.2" ry="6" fill="#2D2D2D" />
    <circle cx="142" cy="104" r="2.2" fill="#2D2D2D" />

    {/* Mechanical Keyboard in Left Hand */}
    <g transform="rotate(-16 86 125)">
      <rect x="64" y="88" width="38" height="72" rx="4" fill="#FAF7F0" stroke="#2D2D2D" strokeWidth="2.3" />
      <line x1="72" y1="96" x2="72" y2="152" stroke="#2D2D2D" strokeWidth="1.6" strokeDasharray="4 3" />
      <line x1="80" y1="96" x2="80" y2="152" stroke="#2D2D2D" strokeWidth="1.6" strokeDasharray="4 3" />
      <line x1="88" y1="96" x2="88" y2="152" stroke="#2D2D2D" strokeWidth="1.6" strokeDasharray="4 3" />
      <line x1="95" y1="96" x2="95" y2="152" stroke="#2D2D2D" strokeWidth="1.6" strokeDasharray="4 3" />
    </g>

    {/* Brown Sugar Boba Cup in Right Hand */}
    <line x1="168" y1="102" x2="173" y2="132" stroke="#2D2D2D" strokeWidth="3.2" strokeLinecap="round" />
    <polygon
      points="154,120 188,120 183,160 159,160"
      fill="#FAF7F0"
      stroke="#2D2D2D"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <polygon points="156,129 186,129 183,159 159,159" fill="#C89D70" fillOpacity="0.65" />
    {/* Boba Pearls */}
    <circle cx="165" cy="153" r="2.4" fill="#2D2D2D" />
    <circle cx="172" cy="154" r="2.4" fill="#2D2D2D" />
    <circle cx="178" cy="152" r="2.4" fill="#2D2D2D" />
    <circle cx="168" cy="147" r="2.2" fill="#2D2D2D" />
    <circle cx="175" cy="147" r="2.2" fill="#2D2D2D" />
  </svg>
);

