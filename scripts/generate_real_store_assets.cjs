const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, 'google-play-assets');
const ARTIFACT_DIR = '/Users/claw/.gemini/antigravity/brain/7cd80a8a-ebcc-4e90-98cf-e241004fcb04/google-play-assets';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toBase64(filePath) {
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).replace('.', '') || 'png';
    return `data:image/${ext};base64,` + fs.readFileSync(filePath).toString('base64');
  }
  return '';
}

// User-provided real screenshots
const USER_DIR = '/Users/claw/.gemini/antigravity/brain/7cd80a8a-ebcc-4e90-98cf-e241004fcb04/.user_uploaded';
const img1 = toBase64(path.join(USER_DIR, 'media_1794292893813_c4e2b6a2.png')); // Main Desk Ghost
const img2 = toBase64(path.join(USER_DIR, 'media_1794284457964_62d685bb.png')); // 4x5 Desk Widget on Home
const img3 = toBase64(path.join(USER_DIR, 'media_1794292900166_891636aa.png')); // Multi-Widget Home
const img4 = toBase64(path.join(USER_DIR, 'media_1794292906580_8f5c8584.png')); // Sealed Future Talisman
const img5 = toBase64(path.join(USER_DIR, 'media_1794292887115_70681f5c.png')); // Birthday Wishes
const img6 = toBase64(path.join(USER_DIR, 'media_1794292877947_f47165cd.png')); // IG Story Modal

function wrapScreenshot(title, subtitle, tagText, phoneContent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <style>
      .font-serif { font-family: "Noto Serif TC", "Songti TC", "Baskerville", serif; }
      .font-sans { font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Heiti TC", "Segoe UI", sans-serif; }
      .font-mono { font-family: "SF Mono", "Menlo", monospace; }
      .card-shadow { filter: drop-shadow(0px 24px 40px rgba(45, 45, 45, 0.20)); }
      .subtle-shadow { filter: drop-shadow(0px 12px 24px rgba(45, 45, 45, 0.18)); }
      .glow-tag { filter: drop-shadow(0px 4px 12px rgba(200, 62, 49, 0.30)); }
    </style>
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FAF6F0"/>
      <stop offset="45%" stop-color="#F2ECE1"/>
      <stop offset="100%" stop-color="#E5DCCE"/>
    </linearGradient>
    <pattern id="dotPattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1.5" fill="#2D2D2D" opacity="0.04" />
    </pattern>
    <linearGradient id="swagCoverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1A100E"/>
      <stop offset="30%" stop-color="#1E1410"/>
      <stop offset="70%" stop-color="#261B14"/>
      <stop offset="100%" stop-color="#2B1D14"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="url(#mainBg)"/>
  <rect width="1080" height="1920" fill="url(#dotPattern)"/>

  <!-- Top Marketing Header -->
  <g transform="translate(0, 110)">
    <g class="glow-tag">
      <rect x="540" y="0" width="340" height="50" rx="25" transform="translate(-170, 0)" fill="#C83E31"/>
      <text x="540" y="33" class="font-sans" font-size="22" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">${escapeXml(tagText)}</text>
    </g>
    <text x="540" y="128" class="font-serif" font-size="62" font-weight="900" fill="#2D2D2D" text-anchor="middle" letter-spacing="1">${escapeXml(title)}</text>
    <text x="540" y="188" class="font-sans" font-size="28" font-weight="600" fill="#6E6A63" text-anchor="middle">${escapeXml(subtitle)}</text>
  </g>

  <!-- Phone Mockup Container -->
  <g transform="translate(0, 360)">
    ${phoneContent}
  </g>
</svg>`;
}

function makePhoneMockup(imgBase64, clipId, callouts = [], screenOverlays = '') {
  return `
    <g class="card-shadow" transform="translate(190, 20)">
      <!-- Outer Phone Body -->
      <rect x="0" y="0" width="700" height="1440" rx="64" fill="#1C1C1E" stroke="#3A3A3C" stroke-width="6"/>
      <!-- Inner Screen Bezel -->
      <rect x="18" y="18" width="664" height="1404" rx="48" fill="#121212"/>

      <!-- Screen Screenshot -->
      <g clip-path="url(#${clipId})" transform="translate(18, 18)">
        <clipPath id="${clipId}">
          <rect x="0" y="0" width="664" height="1404" rx="48"/>
        </clipPath>
        <image href="${imgBase64}" x="0" y="0" width="664" height="1404" preserveAspectRatio="xMidYMid slice"/>

        <!-- Custom In-Screen Overlays (Privacy Censorship & App Icon Removal) -->
        ${screenOverlays}
      </g>

      <!-- Glass Screen Gloss Reflection -->
      <path d="M 18 18 L 400 18 L 18 800 Z" fill="white" opacity="0.03" clip-path="url(#${clipId})" transform="translate(18, 18)"/>

      <!-- Dynamic Island / Top Camera Pill -->
      <rect x="250" y="32" width="200" height="34" rx="17" fill="#000000" opacity="0.95"/>
      <circle cx="420" cy="49" r="6" fill="#151515"/>

      <!-- Callout Badges -->
      ${callouts.map(c => `
        <g class="subtle-shadow" transform="translate(${c.x}, ${c.y})">
          <rect x="0" y="0" width="${c.w}" height="${c.h}" rx="${c.h / 2}" fill="${c.bg || '#C83E31'}" stroke="${c.stroke || '#FAF6F0'}" stroke-width="${c.strokeWidth || 0}"/>
          <text x="${c.w / 2}" y="${c.h / 2 + 8}" class="font-sans" font-size="${c.fontSize || 22}" font-weight="900" fill="${c.color || '#FFFFFF'}" text-anchor="middle">${escapeXml(c.text)}</text>
        </g>
      `).join('\n')}
    </g>
  `;
}

// Overlays for Screen 3 (Multi-Widget):
// 1. Cover "SWAG" app icon seamlessly with wallpaper gradient
// 2. Hide calendar event name "Competition ..." in 4x4 widget with "團隊進度週會"
const screen3Overlays = `
  <!-- Remove SWAG app icon -->
  <rect x="514" y="105" width="145" height="152" rx="4" fill="url(#swagCoverGrad)"/>
  
  <!-- Anonymize Calendar Event in 4x4 monthly widget -->
  <rect x="225" y="986" width="150" height="20" fill="#D5D1C8"/>
  <text x="228" y="1001" class="font-sans" font-size="13" font-weight="bold" fill="#3A3A3C">團隊進度週會</text>
`;

// Overlays for Screen 4 (Sealed Future):
// Anonymize birthday toast name in top banner
const screen4Overlays = `
  <!-- Anonymize birthday banner name -->
  <rect x="330" y="132" width="125" height="22" rx="11" fill="#262626"/>
  <text x="336" y="148" class="font-sans" font-size="13" font-weight="500" fill="#A3A3A3">(偵測到好友生日)</text>
`;

// Overlays for Screen 5 (Birthday Wishes):
// 1. Cover "Caitlin Kao..." with generic "好友生日慶祝"
// 2. Anonymize user email and friend names in calendar event list
const screen5Overlays = `
  <!-- 1. Header Birthday Name replacement -->
  <rect x="254" y="238" width="130" height="20" fill="#FFF8EB"/>
  <text x="255" y="254" class="font-sans" font-size="16" font-weight="bold" fill="#785A3C">好友生日慶祝</text>

  <!-- 2. Event 1: Caitlin Kao Birthday -> 好友生日派對 -->
  <!-- Blue Pill (mask email) -->
  <rect x="143" y="962" width="138" height="23" rx="5" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"/>
  <text x="212" y="978" class="font-sans" font-size="13" font-weight="600" fill="#2563EB" text-anchor="middle">Google 行事曆</text>
  <!-- Title (mask name) -->
  <rect x="286" y="962" width="220" height="23" fill="#FFFFFF"/>
  <text x="287" y="979" class="font-sans" font-size="16" font-weight="bold" fill="#1F2937">好友生日派對 🎉</text>

  <!-- 3. Event 2: Ray Kuo special day -> 團隊年度聚餐 -->
  <!-- Blue Pill (mask email) -->
  <rect x="143" y="1024" width="138" height="23" rx="5" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"/>
  <text x="212" y="1040" class="font-sans" font-size="13" font-weight="600" fill="#2563EB" text-anchor="middle">Google 行事曆</text>
  <!-- Title (mask name) -->
  <rect x="286" y="1024" width="220" height="23" fill="#FFFFFF"/>
  <text x="287" y="1041" class="font-sans" font-size="16" font-weight="bold" fill="#1F2937">團隊年度聚餐 🍻</text>

  <!-- 4. Event 3: Harrison Cello Lesson -> 專案進度匯報 -->
  <!-- Blue Pill (mask email) -->
  <rect x="143" y="1086" width="138" height="23" rx="5" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"/>
  <text x="212" y="1102" class="font-sans" font-size="13" font-weight="600" fill="#2563EB" text-anchor="middle">Google 行事曆</text>
  <!-- Title (mask name) -->
  <rect x="286" y="1086" width="220" height="23" fill="#FFFFFF"/>
  <text x="287" y="1103" class="font-sans" font-size="16" font-weight="bold" fill="#1F2937">專案進度匯報 📊</text>
`;

const assets = [
  {
    filename: 'screenshot_1_daily_desk',
    tag: '每日社畜生存桌曆',
    title: '每天撕一頁 每天被治癒',
    subtitle: '365 天不重複毒舌金句・專屬插畫手撕紙感',
    img: img1,
    overlays: '',
    callouts: [
      { x: -70, y: 180, w: 270, h: 60, text: '✂️ 撕頁解鎖今日', bg: '#C83E31' },
      { x: 490, y: 1120, w: 240, h: 56, text: '🔥 帶薪摸魚指南', bg: '#2D2D2D', stroke: '#FAF6F0', strokeWidth: 2, color: '#E2C589' },
    ]
  },
  {
    filename: 'screenshot_2_widget_4x5',
    tag: 'ANDROID 桌面小工具',
    title: '4×5 擬真手撕桌曆小工具',
    subtitle: '把復古撕頁桌曆搬上手機主畫面・免開 App 即刻開酸',
    img: img2,
    overlays: '',
    callouts: [
      { x: -80, y: 220, w: 270, h: 60, text: '✂️ 桌面一鍵撕頁', bg: '#C83E31' },
      { x: 470, y: 740, w: 280, h: 60, text: '🔥 4×5 擬真大桌曆', bg: '#2D2D2D', stroke: '#FAF6F0', strokeWidth: 2, color: '#E2C589' },
    ]
  },
  {
    filename: 'screenshot_3_survival_stamp',
    tag: '桌面小工具生態圈',
    title: '4×2、1×1、4×4 隨心擺放',
    subtitle: '每日金句、一秒打卡、整月農民曆全支援',
    img: img3,
    overlays: screen3Overlays,
    callouts: [
      { x: -70, y: 200, w: 280, h: 58, text: '⚡ 4×2 每日隨機幹話', bg: '#2D2D2D', stroke: '#FAF6F0', strokeWidth: 2, color: '#FAF6F0' },
      { x: 500, y: 380, w: 220, h: 54, text: '🔴 1 秒生存蓋章', bg: '#C83E31' },
      { x: -80, y: 880, w: 270, h: 58, text: '🗓️ 4×4 整月農民曆', bg: '#C83E31' },
    ]
  },
  {
    filename: 'screenshot_4_calendar_roast',
    tag: '行事曆連動與封印保護',
    title: '日常行程連動 未來幹話封印',
    subtitle: '行程越多吐槽越狠！敕令符咒封印未來的爛事',
    img: img4,
    overlays: screen4Overlays,
    callouts: [
      { x: -70, y: 220, w: 290, h: 60, text: '🔮 敕令・未來幹話封印', bg: '#C83E31' },
      { x: 470, y: 1040, w: 260, h: 56, text: '📅 行程智能變吐槽', bg: '#2D2D2D', stroke: '#FAF6F0', strokeWidth: 2, color: '#E2C589' },
    ]
  },
  {
    filename: 'screenshot_5_birthday_wishes',
    tag: '壽星幹話祝賀產生器',
    title: '生日祝賀詞 一鍵隨機複製',
    subtitle: '群組省力跟風・職場同事・損友厭世專用・免動腦交差',
    img: img5,
    overlays: screen5Overlays,
    callouts: [
      { x: -70, y: 200, w: 240, h: 58, text: '🎂 壽星慶生模式', bg: '#C83E31' },
      { x: 440, y: 920, w: 310, h: 60, text: '📋 4 大祝賀風格一鍵複製', bg: '#2D2D2D', stroke: '#FAF6F0', strokeWidth: 2, color: '#E2C589' },
    ]
  },
  {
    filename: 'screenshot_6_ig_story',
    tag: '9:16 高清限動導出',
    title: '一鍵分享 IG 高清限時動態',
    subtitle: '厭世不能只有我看到！純粹手撕紙質感、高清無浮水印',
    img: img6,
    overlays: '',
    callouts: [
      { x: -70, y: 220, w: 280, h: 58, text: '✨ PRO 高清無浮水印', bg: '#059669' },
      { x: 480, y: 1100, w: 260, h: 60, text: '📸 一鍵直通 IG 限動', bg: '#C83E31' },
    ]
  },
];

console.log('Regenerating all 6 phone assets with censorship and icon removal...');

for (const a of assets) {
  const phoneContent = makePhoneMockup(a.img, `clip_${a.filename}`, a.callouts, a.overlays);
  const fullSvg = wrapScreenshot(a.title, a.subtitle, a.tag, phoneContent);

  const svgPath = path.join(OUTPUT_DIR, `${a.filename}.svg`);
  const pngPath = path.join(OUTPUT_DIR, `${a.filename}.png`);
  const artifactPngPath = path.join(ARTIFACT_DIR, `${a.filename}.png`);

  fs.writeFileSync(svgPath, fullSvg, 'utf8');

  // Convert to high-res 1080x1920 PNG using macOS sips
  execSync(`sips -s format png -z 1920 1080 "${svgPath}" --out "${pngPath}"`, { stdio: 'pipe' });
  fs.copyFileSync(pngPath, artifactPngPath);
  console.log(`✓ Updated ${a.filename}.png (1080x1920)`);
}

console.log('Done! All assets updated and copied to artifact directory.');
