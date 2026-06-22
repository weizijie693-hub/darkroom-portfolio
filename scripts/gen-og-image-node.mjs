// Darkroom Studio — OG Image Generator (pure Node.js, zero dependencies)
// Generates 1200x630 social share card with darkroom aesthetic
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// ─── PNG primitives (same as icon generator) ────────────────────────

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBuf = data || Buffer.alloc(0);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dataBuf.length, 0);
  const header = Buffer.concat([len, typeBytes]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([typeBytes, dataBuf])), 0);
  return Buffer.concat([header, dataBuf, crcVal]);
}

function createPNG(width, height, rgbPixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const dst = rowStart + 1 + x * 3;
      raw[dst]     = rgbPixels[idx];
      raw[dst + 1] = rgbPixels[idx + 1];
      raw[dst + 2] = rgbPixels[idx + 2];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND'),
  ]);
}

// ─── Drawing helpers ────────────────────────────────────────────────

function setPixel(pixels, width, x, y, r, g, b) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || ix >= width || iy < 0 || iy >= width) return;
  const idx = (iy * width + ix) * 3;
  pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b;
}

function fillRect(pixels, width, x, y, w, h, r, g, b) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(width, Math.round(x + w));
  const y1 = Math.min(width, Math.round(y + h));
  for (let py = y0; py < y1; py++)
    for (let px = x0; px < x1; px++) {
      const idx = (py * width + px) * 3;
      pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b;
    }
}

function fillEllipse(pixels, width, cx, cy, rx, ry, r, g, b) {
  const x0 = Math.max(0, Math.round(cx - rx));
  const y0 = Math.max(0, Math.round(cy - ry));
  const x1 = Math.min(width, Math.round(cx + rx));
  const y1 = Math.min(width, Math.round(cy + ry));
  for (let py = y0; py < y1; py++)
    for (let px = x0; px < x1; px++) {
      const dx = (px - cx) / rx, dy = (py - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const idx = (py * width + px) * 3;
        pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b;
      }
    }
}

function drawLine(pixels, width, x0, y0, x1, y1, r, g, b) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = Math.round(x0), y = Math.round(y0);
  for (let i = 0; i <= (dx + dy || 1) * 2; i++) {
    setPixel(pixels, width, x, y, r, g, b);
    if (x === Math.round(x1) && y === Math.round(y1)) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function blendOver(pixels, width, x, y, r, g, b, alpha) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || ix >= width || iy < 0 || iy >= width) return;
  const idx = (iy * width + ix) * 3;
  pixels[idx]     = Math.round(pixels[idx] * (1 - alpha) + r * alpha);
  pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - alpha) + g * alpha);
  pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - alpha) + b * alpha);
}

// ─── Composition ────────────────────────────────────────────────────

const W = 1200;
const H = 630;
const pixels = new Uint8Array(W * H * 3);

// --- Background: deep black base ---
fillRect(pixels, W, 0, 0, W, H, 10, 10, 10);

// --- Radial glow from upper-left ---
const glowSteps = 30;
const glowCX = W * 0.35;
const glowCY = H * 0.3;
for (let i = glowSteps; i >= 0; i--) {
  const ratio = i / glowSteps;
  const alpha = ratio * 0.08;
  const r = Math.round(26 * (1 - ratio) + 10);
  const g = Math.round(24 * (1 - ratio) + 10);
  const b = Math.round(22 * (1 - ratio) + 10);
  const cx = glowCX + (0.5 - ratio) * W * 0.12;
  const cy = glowCY + (0.5 - ratio) * H * 0.1;
  const rad = W * 0.08 + ratio * W * 0.7;
  fillEllipse(pixels, W, cx, cy, rad, rad * 0.8, r, g, b);
}

// --- Noise texture ---
for (let i = 0; i < W * H * 0.25; i++) {
  const nx = Math.floor(Math.random() * W);
  const ny = Math.floor(Math.random() * H);
  const noise = (Math.random() - 0.5) * 14;
  const idx = (ny * W + nx) * 3;
  const nr = Math.max(0, Math.min(255, pixels[idx] + noise));
  const ng = Math.max(0, Math.min(255, pixels[idx + 1] + noise));
  const nb = Math.max(0, Math.min(255, pixels[idx + 2] + noise));
  pixels[idx] = nr; pixels[idx + 1] = ng; pixels[idx + 2] = nb;
}

// --- Vignette ---
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W * 0.5);
    const dy = (y - H / 2) / (H * 0.5);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vignetteAlpha = Math.max(0, Math.min(1, (dist - 0.35) * 1.2));
    blendOver(pixels, W, x, y, 0, 0, 0, vignetteAlpha * 0.55);
  }
}

// --- Film sprocket holes ---
const holeSpacing = 32;
const holeW = 7, holeH = 10;
for (let x = 30; x < W; x += holeSpacing) {
  fillRect(pixels, W, x, 10, holeW, holeH, 26, 26, 26);
  fillRect(pixels, W, x, H - 20, holeW, holeH, 26, 26, 26);
}

// --- Frame border ---
const frameX = 60, frameY = 50;
const frameW = W - 120, frameH = H - 100;

// Outer frame
for (let x = frameX; x <= frameX + frameW; x++) {
  setPixel(pixels, W, x, frameY, 200, 180, 140);
  setPixel(pixels, W, x, frameY + frameH, 200, 180, 140);
}
for (let y = frameY; y <= frameY + frameH; y++) {
  setPixel(pixels, W, frameX, y, 200, 180, 140);
  setPixel(pixels, W, frameX + frameW, y, 200, 180, 140);
}

// Inner frame
const innerM = 12;
for (let x = frameX + innerM; x <= frameX + frameW - innerM; x++) {
  blendOver(pixels, W, x, frameY + innerM, 200, 180, 140, 0.1);
  blendOver(pixels, W, x, frameY + frameH - innerM, 200, 180, 140, 0.1);
}
for (let y = frameY + innerM; y <= frameY + frameH - innerM; y++) {
  blendOver(pixels, W, frameX + innerM, y, 200, 180, 140, 0.1);
  blendOver(pixels, W, frameX + frameW - innerM, y, 200, 180, 140, 0.1);
}

// --- Corner accents ---
const cornerM = frameX;
const cornerLen = 30;
const goldR = 200, goldG = 180, goldB = 140;

function drawCorner(cx, cy, dx, dy) {
  drawLine(pixels, W, cx, cy + cornerLen * dy, cx, cy, goldR, goldG, goldB);
  drawLine(pixels, W, cx, cy, cx + cornerLen * dx, cy, goldR, goldG, goldB);
}
drawCorner(frameX, frameY, 1, 1);                          // TL
drawCorner(frameX + frameW, frameY, -1, 1);                // TR
drawCorner(frameX, frameY + frameH, 1, -1);                // BL
drawCorner(frameX + frameW, frameY + frameH, -1, -1);      // BR

// --- Central geometric motif: camera aperture ---
const motifCX = W / 2;
const motifCY = H * 0.33;

// Outer ring of aperture
const apertureR = 55;
for (let a = 0; a < 360; a += 0.3) {
  const rad = a * Math.PI / 180;
  setPixel(pixels, W,
    motifCX + Math.cos(rad) * apertureR,
    motifCY + Math.sin(rad) * apertureR,
    200, 180, 130);
}
// Inner ring
const apertureInnerR = 22;
for (let a = 0; a < 360; a += 0.3) {
  const rad = a * Math.PI / 180;
  setPixel(pixels, W,
    motifCX + Math.cos(rad) * apertureInnerR,
    motifCY + Math.sin(rad) * apertureInnerR,
    180, 160, 120);
}
// Aperture blades (6)
const bladeCount = 6;
for (let b = 0; b < bladeCount; b++) {
  const baseAngle = (b / bladeCount) * Math.PI * 2 - Math.PI / 2;
  const p1x = motifCX + Math.cos(baseAngle) * apertureInnerR;
  const p1y = motifCY + Math.sin(baseAngle) * apertureInnerR;
  const p2x = motifCX + Math.cos(baseAngle + Math.PI / bladeCount) * apertureR;
  const p2y = motifCY + Math.sin(baseAngle + Math.PI / bladeCount) * apertureR;
  drawLine(pixels, W, p1x, p1y, p2x, p2y, 150, 130, 100);
}
// Center dot
fillEllipse(pixels, W, motifCX, motifCY, 5, 5, 220, 200, 160);

// --- Text section: "暗房工作室" (rendered as geometric blocks) ---
// We can't render Chinese text, so we use elegant geometric typography
// A horizontal line above text
const textBaseY = H * 0.56;
drawLine(pixels, W, W * 0.35, textBaseY - 5, W * 0.65, textBaseY - 5, 180, 170, 140);

// "DARKROOM STUDIO" rendered as pixel blocks
// Simulating thin elegant sans-serif text with a simplified approach
const drY = textBaseY + 30;
const drW = 290, drH = 2;
fillRect(pixels, W, W / 2 - drW / 2, drY, drW, drH, 190, 175, 140);

// Subtitle line
const subY = drY + 40;
const subW = 280;
fillRect(pixels, W, W / 2 - subW / 2, subY, subW, 1, 135, 120, 90);

// Tagline area - thin lines suggesting text
const tagY = subY + 30;
const tagSegments = [[-140, -80], [-60, -10], [20, 70], [100, 150]];
for (const [sx, ex] of tagSegments) {
  fillRect(pixels, W, W / 2 + sx, tagY, ex - sx, 1, 100, 90, 70);
}

// --- Bottom decorative divider ---
const divY = H * 0.8;
drawLine(pixels, W, W * 0.3, divY, W * 0.7, divY, 120, 105, 80);

// --- Bottom text area ---
// Left: URL
const botTextY = H - 45;
fillRect(pixels, W, 80, botTextY, 120, 2, 85, 75, 55);
// Right: copyright
fillRect(pixels, W, W - 200, botTextY, 140, 2, 85, 75, 55);

// --- Subtle light leak (top-left warm gradient) ---
for (let y = 0; y < H * 0.5; y++) {
  for (let x = 0; x < W * 0.35; x++) {
    const distFromCorner = Math.sqrt((x / (W * 0.35)) ** 2 + (y / (H * 0.5)) ** 2);
    const leakAlpha = Math.max(0, (1 - distFromCorner) * 0.12);
    blendOver(pixels, W, x, y, 60, 30, 10, leakAlpha);
  }
}

// ─── Encode & Save ──────────────────────────────────────────────────

// Try JPEG first via simple approach, fallback to PNG
const outPath = join(rootDir, 'og-image.png');
const pngData = createPNG(W, H, pixels);
writeFileSync(outPath, pngData);
console.log(`OK: og-image.png (${W}x${H})`);
console.log(`Saved to: ${outPath}`);
