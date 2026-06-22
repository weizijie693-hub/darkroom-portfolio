// Darkroom Studio — PWA Icon Generator (pure Node.js, zero dependencies)
// Generates all 9 icon sizes with geometric darkroom design
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// ─── PNG binary primitives ──────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBuf = data || Buffer.alloc(0);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dataBuf.length, 0);
  const header = Buffer.concat([len, typeBytes]);
  const crcInput = Buffer.concat([typeBytes, dataBuf]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([header, dataBuf, crcVal]);
}

function createPNG(width, height, rgbPixels) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Build raw image data with filter bytes (None filter for each row)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const dst = rowStart + 1 + x * 3;
      raw[dst]     = rgbPixels[idx];     // R
      raw[dst + 1] = rgbPixels[idx + 1]; // G
      raw[dst + 2] = rgbPixels[idx + 2]; // B
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND'),
  ]);
}

// ─── Drawing helpers ────────────────────────────────────────────────

function fillRect(pixels, width, x, y, w, h, r, g, b) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(width, Math.round(x + w));
  const y1 = Math.min(width, Math.round(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const idx = (py * width + px) * 3;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }
}

function fillEllipse(pixels, width, cx, cy, rx, ry, r, g, b) {
  const x0 = Math.max(0, Math.round(cx - rx));
  const y0 = Math.max(0, Math.round(cy - ry));
  const x1 = Math.min(width, Math.round(cx + rx));
  const y1 = Math.min(width, Math.round(cy + ry));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const dx = (px - cx) / rx;
      const dy = (py - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const idx = (py * width + px) * 3;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
      }
    }
  }
}

function drawLine(pixels, width, x0, y0, x1, y1, r, g, b) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = Math.round(x0), y = Math.round(y0);
  const steps = dx + dy || 1;
  for (let i = 0; i <= steps; i++) {
    if (x >= 0 && x < width && y >= 0 && y < width) {
      const idx = (y * width + x) * 3;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
    if (x === Math.round(x1) && y === Math.round(y1)) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

// ─── Icon design: darkroom studio ───────────────────────────────────

function drawIcon(size) {
  const W = size;
  const H = size;
  const pixels = new Uint8Array(W * H * 3);

  // Background: deep black #0a0a0a
  fillRect(pixels, W, 0, 0, W, H, 10, 10, 10);

  // Radial glow: concentric warm circles
  const glowCX = W * 0.4;
  const glowCY = H * 0.35;
  const glowSteps = 12;
  for (let i = glowSteps; i >= 0; i--) {
    const ratio = i / glowSteps;
    const alpha = Math.round(18 * (1 - ratio));
    const cr = Math.min(255, Math.round(10 + 4 * ratio));
    const cg = Math.min(255, Math.round(8 + 3 * ratio));
    const cb = Math.min(255, Math.round(6 + 2 * ratio));
    const cx = glowCX + (0.5 - ratio) * W * 0.15;
    const cy = glowCY + (0.5 - ratio) * H * 0.15;
    const rad = W * 0.08 + ratio * W * 0.55;
    fillEllipse(pixels, W, cx, cy, rad, rad, cr, cg, cb);
  }

  // Film sprocket holes: top and bottom strips
  const holeGap = W * 0.06;
  const holeW = Math.max(2, Math.round(W * 0.014));
  const holeH = Math.max(2, Math.round(W * 0.025));
  const holeYtop = Math.round(W * 0.025);
  const holeYbot = H - holeYtop - holeH;
  for (let x = holeGap; x + holeW < W; x += holeGap) {
    fillRect(pixels, W, x, holeYtop, holeW, holeH, 26, 26, 26);
    fillRect(pixels, W, x, holeYbot, holeW, holeH, 26, 26, 26);
  }

  // Central motif: stylized camera aperture (concentric circles + blades)
  const centerX = W / 2;
  const centerY = H * 0.44;

  // Outer ring
  const outerR = W * 0.18;
  for (let a = 0; a < 360; a += 0.5) {
    const rad = a * Math.PI / 180;
    const x = centerX + Math.cos(rad) * outerR;
    const y = centerY + Math.sin(rad) * outerR;
    if (x >= 0 && x < W && y >= 0 && y < H) {
      const idx = (Math.round(y) * W + Math.round(x)) * 3;
      pixels[idx] = 180; pixels[idx + 1] = 160; pixels[idx + 2] = 130;
    }
  }
  // Inner ring
  const innerR = W * 0.08;
  for (let a = 0; a < 360; a += 0.5) {
    const rad = a * Math.PI / 180;
    const x = centerX + Math.cos(rad) * innerR;
    const y = centerY + Math.sin(rad) * innerR;
    if (x >= 0 && x < W && y >= 0 && y < H) {
      const idx = (Math.round(y) * W + Math.round(x)) * 3;
      pixels[idx] = 180; pixels[idx + 1] = 160; pixels[idx + 2] = 130;
    }
  }

  // Aperture blades (6 blades)
  const bladeCount = 6;
  for (let b = 0; b < bladeCount; b++) {
    const baseAngle = (b / bladeCount) * Math.PI * 2 - Math.PI / 2;
    const p1x = centerX + Math.cos(baseAngle) * innerR;
    const p1y = centerY + Math.sin(baseAngle) * innerR;
    const p2x = centerX + Math.cos(baseAngle + Math.PI / bladeCount) * outerR;
    const p2y = centerY + Math.sin(baseAngle + Math.PI / bladeCount) * outerR;
    drawLine(pixels, W, p1x, p1y, p2x, p2y, 140, 125, 100);
  }

  // Tiny center dot
  fillEllipse(pixels, W, centerX, centerY, Math.max(2, W * 0.015), Math.max(2, W * 0.015), 200, 190, 160);

  // "DARKROOM" text approximation - subtle line below center
  const textY = H * 0.72;
  const textW = W * 0.35;
  const textH = Math.max(1, Math.round(W * 0.015));
  fillRect(pixels, W, centerX - textW / 2, textY - textH / 2, textW, textH, 80, 72, 60);

  // Corner accents: warm gold L-shapes
  const m = W * 0.1;
  const cl = W * 0.06;
  const goldR = 200, goldG = 180, goldB = 140;

  function corner(x, y, dx, dy) {
    drawLine(pixels, W, x, y + cl * dy, x, y, goldR, goldG, goldB);
    drawLine(pixels, W, x, y, x + cl * dx, y, goldR, goldG, goldB);
  }
  corner(m, m, 1, 1);                          // TL
  corner(W - m, m, -1, 1);                     // TR
  corner(m, H - m, 1, -1);                     // BL
  corner(W - m, H - m, -1, -1);                // BR

  return pixels;
}

// ─── Generate all sizes ─────────────────────────────────────────────

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  const pixels = drawIcon(size);
  const png = createPNG(size, size, pixels);
  const outPath = join(iconsDir, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`OK: icon-${size}.png (${size}x${size})`);
}

console.log(`\nDone. ${sizes.length} icons in: ${iconsDir}`);
