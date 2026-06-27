/* ══════════════════════════════════════════════════════
   Darkroom Studio — Build Script
   Generates thumbnails, WebP, responsive sizes from source photos
   ══════════════════════════════════════════════════════ */
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PHOTOS_DIR = join(ROOT, 'photos');
const CACHE_DIR = join(PHOTOS_DIR, '.cache');
const MANIFEST_PATH = join(ROOT, 'js', 'photos-manifest.json');

// ─── Config ───
const THUMBNAIL_WIDTH = 400;
const RESPONSIVE_SIZES = [
  { width: 400,  suffix: '400' },
  { width: 800,  suffix: '800' },
  { width: 1600, suffix: '1600' },
];

// Only process these image types
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);

// Photo series order (deterministic ordering)
const SERIES_ORDER = [
  '风过河西',
  'BNBU',
  'HK印象',
  '华侨城',
  '太子湾',
  '汕-AD FUTURE',
  '汕-JUNGLE',
  '对影',
  '深圳国际美术馆',
];

const SERIES_SUBTITLES = {
  '风过河西': 'Wind Over Hexi · 河西走廊',
  'BNBU': '校园光景',
  'HK印象': 'Hong Kong Impression',
  '华侨城': 'Overseas Chinese Town',
  '太子湾': 'Taizi Bay',
  '汕-AD FUTURE': 'Shantou · 汕',
  '汕-JUNGLE': 'Shantou · 丛林',
  '对影': 'Shadow Dialogue · 光影对话',
  '深圳国际美术馆': 'Shenzhen International Art Museum',
};

// ─── Utilities ───
async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

function cachePath(series, filename, variant, ext) {
  const name = basename(filename, extname(filename));
  if (variant === 'original') return join(CACHE_DIR, variant, series, name + ext);
  return join(CACHE_DIR, variant, series, name + ext);
}

function safeName(str) {
  // Keep Chinese and ASCII, strip problematic chars
  return str.replace(/[<>:"/\\|?*]/g, '_');
}

// ─── Detect existing photos ───
async function scanPhotos() {
  /** @type {Array<{id:string, name:string, subtitle:string, files:string[]}>} */
  const series = [];
  const dirs = await readdir(PHOTOS_DIR, { withFileTypes: true });

  // Use SERIES_ORDER for deterministic output
  for (const id of SERIES_ORDER) {
    const dirPath = join(PHOTOS_DIR, id);
    if (!existsSync(dirPath)) continue;

    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase()))
      .map(e => e.name)
      .sort();

    series.push({
      id,
      name: id,
      subtitle: SERIES_SUBTITLES[id] || '',
      files,
    });
  }

  // Add any series not in SERIES_ORDER
  for (const d of dirs) {
    if (!d.isDirectory() || d.name.startsWith('.') || SERIES_ORDER.includes(d.name)) continue;
    const dirPath = join(PHOTOS_DIR, d.name);
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase()))
      .map(e => e.name)
      .sort();
    if (files.length) {
      series.push({ id: d.name, name: d.name, subtitle: '', files });
    }
  }

  return series;
}

// ─── Image processing ───
async function processImage(inputPath, outputDir, width, format, quality = 82) {
  await ensureDir(outputDir);
  const name = basename(inputPath, extname(inputPath));
  const outExt = format === 'webp' ? '.webp' : extname(inputPath);
  const outPath = join(outputDir, name + outExt);

  // Skip if output is newer than input
  try {
    const [inStat, outStat] = await Promise.all([
      stat(inputPath),
      stat(outPath).catch(() => null),
    ]);
    if (outStat && outStat.mtimeMs >= inStat.mtimeMs) {
      return { path: outPath, skipped: true };
    }
  } catch { /* proceed */ }

  let pipeline = sharp(inputPath);
  if (width) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true });
  }

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality, effort: 6 });
  } else if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
  }

  await pipeline.toFile(outPath);
  return { path: outPath, skipped: false };
}

// ─── Main build ───
async function build() {
  console.log('🔍 Scanning photos directory...');
  const series = await scanPhotos();
  let totalPhotos = 0;
  series.forEach(s => totalPhotos += s.files.length);
  console.log(`   Found ${totalPhotos} photos across ${series.length} series\n`);

  const manifest = { series: [], generatedAt: new Date().toISOString() };

  for (const s of series) {
    console.log(`📷 ${s.name} (${s.files.length} photos)`);
    const manifestPhotos = [];

    for (let i = 0; i < s.files.length; i++) {
      const file = s.files[i];
      const inputPath = join(PHOTOS_DIR, s.id, file);
      const progress = `[${i + 1}/${s.files.length}]`;

      // ── Thumbnail (JPEG, 400px) ──
      const thumbDir = join(CACHE_DIR, 'thumbnails', safeName(s.id));
      const { skipped: thumbSkip } = await processImage(inputPath, thumbDir, THUMBNAIL_WIDTH, 'jpeg', 78);
      const thumbName = basename(file, extname(file)) + '.jpg';
      const thumbRel = `photos/.cache/thumbnails/${safeName(s.id)}/${thumbName}`;

      // ── Full-size WebP ──
      const webpDir = join(CACHE_DIR, 'webp', safeName(s.id));
      const { skipped: webpSkip } = await processImage(inputPath, webpDir, null, 'webp', 78);
      const webpName = basename(file, extname(file)) + '.webp';
      const webpRel = `photos/.cache/webp/${safeName(s.id)}/${webpName}`;

      // ── Responsive WebP sizes ──
      const responsiveDir = join(CACHE_DIR, 'responsive', safeName(s.id));
      const srcset = [];
      for (const size of RESPONSIVE_SIZES) {
        const respName = basename(file, extname(file)) + '_' + size.suffix + '.webp';
        await processImage(inputPath, responsiveDir, size.width, 'webp', 78);
        srcset.push(`photos/.cache/responsive/${safeName(s.id)}/${respName} ${size.width}w`);
      }

      manifestPhotos.push({
        file,
        thumbnail: thumbRel,
        webp: webpRel,
        srcset: srcset.join(', '),
        // sizes hint: on mobile 100vw, on desktop ~33vw (3-col grid)
        sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
        // Fallback to original for browsers without WebP
        original: `photos/${encodeURIComponent(s.id)}/${encodeURIComponent(file)}`,
      });

      const tag = thumbSkip && webpSkip ? '⏭' : '✓';
      process.stdout.write(`   ${tag} ${progress} ${file}\r`);
    }
    console.log('');

    // Skip files property, only store generated photo entries
    const { files, ...rest } = s;
    manifest.series.push({
      ...rest,
      photos: manifestPhotos,
    });
  }

  // ── Write manifest ──
  await ensureDir(dirname(MANIFEST_PATH));
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

  // ── Summary ──
  console.log(`\n✅ Build complete!`);
  console.log(`   Manifest → ${MANIFEST_PATH}`);
  console.log(`   Caches  → ${CACHE_DIR}/ (thumbnails | webp | responsive)`);
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
