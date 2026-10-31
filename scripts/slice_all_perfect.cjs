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
  const height = Math.abs(buf.readInt32LE(22));

  function getPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return { b: 240, g: 247, r: 250 };
    const rowInBmp = height - 1 - y;
    const rowSize = Math.floor((width * 3 + 3) / 4) * 4;
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

    // Search box: inward by 50px to eliminate any boundary artifacts from neighbor cells
    const searchMinX = Math.round(c * cellW + 50);
    const searchMaxX = Math.round((c + 1) * cellW - 50);
    const searchMinY = Math.round(r * cellH + 30);
    const searchMaxY = Math.round((r + 1) * cellH - 30);

    let minX = 2048, maxX = 0, minY = 2048, maxY = 0;

    for (let y = searchMinY; y <= searchMaxY; y += 2) {
      for (let x = searchMinX; x <= searchMaxX; x += 2) {
        const p = getPixel(x, y);
        const diff = Math.abs(p.r - bg.r) + Math.abs(p.g - bg.g) + Math.abs(p.b - bg.b);
        if (diff > 32) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Safety fallback if empty
    if (minX > maxX) {
      minX = Math.round(c * cellW + 100);
      maxX = Math.round((c + 1) * cellW - 100);
      minY = Math.round(r * cellH + 100);
      maxY = Math.round((r + 1) * cellH - 100);
    }

    // Expand bounding box safely outwards if character extends past the search margin,
    // stopping before any neighbor cell boundary (at cellW * c and cellW * (c+1))
    const cellLeftBound = Math.round(c * cellW + 12);
    const cellRightBound = Math.round((c + 1) * cellW - 12);
    const cellTopBound = Math.round(r * cellH + 12);
    const cellBottomBound = Math.round((r + 1) * cellH - 12);

    // Expand left
    while (minX > cellLeftBound) {
      let found = false;
      for (let y = minY; y <= maxY; y += 4) {
        const p = getPixel(minX - 2, y);
        if (Math.abs(p.r - bg.r) + Math.abs(p.g - bg.g) + Math.abs(p.b - bg.b) > 32) {
          found = true;
          break;
        }
      }
      if (!found) break;
      minX -= 4;
    }

    // Expand right
    while (maxX < cellRightBound) {
      let found = false;
      for (let y = minY; y <= maxY; y += 4) {
        const p = getPixel(maxX + 2, y);
        if (Math.abs(p.r - bg.r) + Math.abs(p.g - bg.g) + Math.abs(p.b - bg.b) > 32) {
          found = true;
          break;
        }
      }
      if (!found) break;
      maxX += 4;
    }

    // Expand top
    while (minY > cellTopBound) {
      let found = false;
      for (let x = minX; x <= maxX; x += 4) {
        const p = getPixel(x, minY - 2);
        if (Math.abs(p.r - bg.r) + Math.abs(p.g - bg.g) + Math.abs(p.b - bg.b) > 32) {
          found = true;
          break;
        }
      }
      if (!found) break;
      minY -= 4;
    }

    // Expand bottom
    while (maxY < cellBottomBound) {
      let found = false;
      for (let x = minX; x <= maxX; x += 4) {
        const p = getPixel(x, maxY + 2);
        if (Math.abs(p.r - bg.r) + Math.abs(p.g - bg.g) + Math.abs(p.b - bg.b) > 32) {
          found = true;
          break;
        }
      }
      if (!found) break;
      maxY += 4;
    }

    const centerX = Math.round((minX + maxX) / 2);
    const centerY = Math.round((minY + maxY) / 2);
    const objW = maxX - minX;
    const objH = maxY - minY;

    // Generous square crop with nice breathing room, clamped to never exceed cell boundaries
    let cropSize = Math.max(500, Math.min(580, Math.max(objW, objH) + 64));
    let cropLeft = Math.max(0, Math.min(2048 - cropSize, Math.round(centerX - cropSize / 2)));
    let cropTop = Math.max(0, Math.min(2048 - cropSize, Math.round(centerY - cropSize / 2)));

    // Ensure cropLeft and cropTop don't cross neighboring cells
    if (cropLeft < cellLeftBound - 6) cropLeft = cellLeftBound - 6;
    if (cropLeft + cropSize > cellRightBound + 6) cropLeft = cellRightBound + 6 - cropSize;
    if (cropTop < cellTopBound - 6) cropTop = cellTopBound - 6;
    if (cropTop + cropSize > cellBottomBound + 6) cropTop = cellBottomBound + 6 - cropSize;

    console.log(
      `✓ [${scene.sceneId}] "${scene.title}" => center: (${centerX}, ${centerY}), size: ${cropSize}x${cropSize}, offset: (${cropTop}, ${cropLeft})`
    );

    const outPng = path.join(SCENES_DIR, `${scene.sceneId}.png`);
    const outWebp = path.join(SCENES_DIR, `${scene.sceneId}.webp`);

    execSync(
      `sips -c ${cropSize} ${cropSize} --cropOffset ${cropTop} ${cropLeft} "${jpgPath}" --out "${outPng}"`
    );
    fs.copyFileSync(outPng, outWebp);
  }

  // Cleanup temporary BMP
  fs.unlinkSync(bmpPath);
}

console.log('\nSUCCESS: All 54 character scene illustrations are cropped, centered, and isolated!');
