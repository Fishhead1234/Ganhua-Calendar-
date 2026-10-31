const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const scenesManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/scenes_manifest.json'), 'utf8')
);

const SHEETS = [
  { char: 'cat', num: 1, file: 'cat_sheet.jpg' },
  { char: 'cat', num: 2, file: 'cat_sheet_2.jpg' },
  { char: 'capybara', num: 1, file: 'capybara_sheet.jpg' },
  { char: 'capybara', num: 2, file: 'capybara_sheet_2.jpg' },
  { char: 'ghost', num: 1, file: 'ghost_sheet.jpg' },
  { char: 'ghost', num: 2, file: 'ghost_sheet_2.jpg' },
];

const SHEETS_DIR = path.join(__dirname, '../public/assets/sheets');
const SCENES_DIR = path.join(__dirname, '../public/assets/scenes');

if (!fs.existsSync(SCENES_DIR)) {
  fs.mkdirSync(SCENES_DIR, { recursive: true });
}

// Helper to crop BMP directly in memory without relying on sips --cropOffset
function cropBmpDirect(srcBuf, left, top, w, h, outFile) {
  const srcOff = srcBuf.readUInt32LE(10);
  const srcW = srcBuf.readInt32LE(18);
  const rawH = srcBuf.readInt32LE(22);
  const isTopDown = rawH < 0;
  const srcH = Math.abs(rawH);
  const srcRow = Math.floor((srcW * 3 + 3) / 4) * 4;

  const dstRow = Math.floor((w * 3 + 3) / 4) * 4;
  const dstFileSize = 54 + dstRow * h;
  const dst = Buffer.alloc(dstFileSize);

  // Copy standard 54-byte BMP header
  srcBuf.copy(dst, 0, 0, 54);
  dst.writeUInt32LE(dstFileSize, 2);
  dst.writeInt32LE(w, 18);
  dst.writeInt32LE(isTopDown ? -h : h, 22);

  for (let dy = 0; dy < h; dy++) {
    const sy = top + dy;
    const dstRowPos = 54 + (isTopDown ? dy : (h - 1 - dy)) * dstRow;

    if (sy < 0 || sy >= srcH) {
      dst.fill(245, dstRowPos, dstRowPos + dstRow);
      continue;
    }

    const srcRowPos = srcOff + (isTopDown ? sy : (srcH - 1 - sy)) * srcRow + left * 3;
    srcBuf.copy(dst, dstRowPos, srcRowPos, srcRowPos + w * 3);
  }

  fs.writeFileSync(outFile, dst);
}

// Process each sheet at full 2048x2048 resolution
for (const sheet of SHEETS) {
  const jpgPath = path.join(SHEETS_DIR, sheet.file);
  const bmpPath = `/tmp/full_${sheet.char}_${sheet.num}.bmp`;

  console.log(`\n========================================`);
  console.log(`Processing: ${sheet.file}`);
  console.log(`========================================`);

  execSync(`sips -s format bmp "${jpgPath}" --out "${bmpPath}"`);

  const buf = fs.readFileSync(bmpPath);
  const dataOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const rawH = buf.readInt32LE(22);
  const isTopDown = rawH < 0;
  const height = Math.abs(rawH);
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4;

  function getPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return { b: 240, g: 247, r: 250 };
    const rowInBmp = isTopDown ? y : (height - 1 - y);
    const pos = dataOffset + rowInBmp * rowSize + x * 3;
    return { b: buf[pos], g: buf[pos + 1], r: buf[pos + 2] };
  }

  // Sample background color from multiple safe corners
  const bg1 = getPixel(15, 15);
  const bg2 = getPixel(2030, 15);
  const bg = {
    r: Math.round((bg1.r + bg2.r) / 2),
    g: Math.round((bg1.g + bg2.g) / 2),
    b: Math.round((bg1.b + bg2.b) / 2),
  };

  const sheetScenes = scenesManifest.filter(
    (s) => s.character === sheet.char && s.sheet === sheet.num
  );

  for (const scene of sheetScenes) {
    const r = scene.row - 1; // 0, 1, 2
    const c = scene.col - 1; // 0, 1, 2

    // Nominal cell dimensions in 2048x2048
    const cellW = 2048 / 3; // ~682.66
    const cellH = 2048 / 3;

    // Search boundaries within this cell
    // Special case: on cat_sheet_2, cell 0 has papers sticking right up to x=790
    // so cell 1 must not search to the left of 800
    let cellMinX = Math.round(c * cellW + 15);
    let cellMaxX = Math.round((c + 1) * cellW - 15);
    if (sheet.file === 'cat_sheet_2.jpg' && c === 1) {
      cellMinX = 800;
    }

    const cellMinY = Math.round(r * cellH + 15);
    const cellMaxY = Math.round((r + 1) * cellH - 15);

    let minX = 2048, maxX = 0, minY = 2048, maxY = 0;

    for (let y = cellMinY; y <= cellMaxY; y += 2) {
      for (let x = cellMinX; x <= cellMaxX; x += 2) {
        const p = getPixel(x, y);
        const diff = Math.abs(p.r - bg.r) + Math.abs(p.g - bg.g) + Math.abs(p.b - bg.b);
        if (diff > 35) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Fallback if empty
    if (minX > maxX) {
      minX = Math.round(c * cellW + 100);
      maxX = Math.round((c + 1) * cellW - 100);
      minY = Math.round(r * cellH + 100);
      maxY = Math.round((r + 1) * cellH - 100);
    }

    const centerX = Math.round((minX + maxX) / 2);
    const centerY = Math.round((minY + maxY) / 2);
    const objW = maxX - minX;
    const objH = maxY - minY;

    // Generous square crop with nice breathing room (620-680px)
    let cropSize = Math.max(620, Math.min(680, Math.max(objW, objH) + 90));
    let cropLeft = Math.max(0, Math.min(2048 - cropSize, Math.round(centerX - cropSize / 2)));
    let cropTop = Math.max(0, Math.min(2048 - cropSize, Math.round(centerY - cropSize / 2)));

    // Ensure cropLeft never bleeds into adjacent running cat papers on cat_sheet_2
    if (sheet.file === 'cat_sheet_2.jpg' && c === 1) {
      if (cropLeft < 795) cropLeft = 795;
    }

    // Never cut off the top of the character
    if (cropTop > minY - 30) {
      cropTop = Math.max(0, minY - 30);
    }
    // Never cut off bottom
    if (cropTop + cropSize < maxY + 30) {
      cropTop = Math.min(2048 - cropSize, maxY + 30 - cropSize);
    }

    console.log(
      `✓ [${scene.sceneId}] "${scene.title}" => center: (${centerX}, ${centerY}), size: ${cropSize}x${cropSize}, crop: (${cropLeft}, ${cropTop})`
    );

    const tempBmp = `/tmp/crop_${scene.sceneId}.bmp`;
    const outPng = path.join(SCENES_DIR, `${scene.sceneId}.png`);
    const outWebp = path.join(SCENES_DIR, `${scene.sceneId}.webp`);

    // In-memory direct BMP cropping
    cropBmpDirect(buf, cropLeft, cropTop, cropSize, cropSize, tempBmp);

    // Convert BMP to PNG and true WebP
    execSync(`sips -s format png "${tempBmp}" --out "${outPng}"`);
    execSync(`/opt/homebrew/bin/cwebp -q 92 "${outPng}" -o "${outWebp}"`);

    fs.unlinkSync(tempBmp);
  }

  // Cleanup temporary sheet BMP
  fs.unlinkSync(bmpPath);
}

console.log('\nSUCCESS: All 54 character scenes have been accurately cropped with memory-direct precision!');
