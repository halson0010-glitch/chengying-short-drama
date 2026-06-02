import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_IMAGE_MODEL,
  formatOpenAIImageDiagnostic,
  generateOpenAIImageWithDiagnostics,
  getRequestedImageModel,
  normalizeImageQuality,
} from './openai-image-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webRoot = path.join(rootDir, 'apps', 'web');
const assetRoot = path.join(webRoot, 'public', 'demo-assets');
const posterDir = path.join(assetRoot, 'posters');
const heroDir = path.join(assetRoot, 'hero');
const mockDramasPath = path.join(webRoot, 'src', 'data', 'mockDramas.ts');

const apiKey = process.env.OPENAI_API_KEY;
const args = parseArgs(process.argv.slice(2));
const requestedModel = getRequestedImageModel();
const useOpenAI = Boolean(apiKey) && !args.fallbackOnly;

function parseArgs(argv) {
  const options = {
    force: false,
    posters: 30,
    featured: 5,
    all: false,
    fallbackOnly: false,
    quality: 'low',
  };

  for (const arg of argv) {
    if (arg === '--force') options.force = true;
    else if (arg === '--all') options.all = true;
    else if (arg === '--fallback-only') options.fallbackOnly = true;
    else if (arg.startsWith('--posters=')) {
      options.posters = Math.max(1, Number(arg.split('=')[1]) || options.posters);
    } else if (arg.startsWith('--featured=')) {
      options.featured = Math.max(1, Number(arg.split('=')[1]) || options.featured);
    } else if (arg.startsWith('--quality=')) {
      options.quality = normalizeImageQuality(arg.split('=')[1]);
    }
  }

  return options;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function extractString(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*'((?:\\\\'|[^'])*)'`));
  return match?.[1]?.replace(/\\'/g, "'") || '';
}

function extractNumber(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*([0-9]+)`));
  return match ? Number(match[1]) : undefined;
}

function extractBoolean(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*(true|false)`));
  return match ? match[1] === 'true' : false;
}

function extractStringArray(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'((?:\\'|[^'])*)'/g)].map((item) => item[1].replace(/\\'/g, "'"));
}

function extractTopLevelObjectBlocks(source) {
  const marker = 'export const mockDramas';
  const markerIndex = source.indexOf(marker);
  const equalsIndex = source.indexOf('=', markerIndex);
  const arrayStart = source.indexOf('[', equalsIndex);
  if (markerIndex < 0 || equalsIndex < 0 || arrayStart < 0) return [];

  const blocks = [];
  let objectDepth = 0;
  let blockStart = -1;
  let inString = false;
  let escape = false;

  for (let index = arrayStart + 1; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === "'") inString = false;
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (objectDepth === 0) blockStart = index;
      objectDepth += 1;
    } else if (char === '}') {
      objectDepth -= 1;
      if (objectDepth === 0 && blockStart >= 0) {
        blocks.push(source.slice(blockStart, index + 1));
        blockStart = -1;
      }
    } else if (char === ']' && objectDepth === 0) {
      break;
    }
  }

  return blocks;
}

async function readMockDramas() {
  const source = await readFile(mockDramasPath, 'utf8');
  return extractTopLevelObjectBlocks(source)
    .map((block, index) => {
      const id = extractString(block, 'id');
      const title = extractString(block, 'title');
      if (!id || !title) return undefined;
      return {
        id,
        title,
        subtitle: extractString(block, 'subtitle'),
        category: extractString(block, 'category'),
        background: extractString(block, 'background'),
        theme: extractString(block, 'theme'),
        audience: extractString(block, 'audience'),
        setting: extractStringArray(block, 'setting'),
        tags: extractStringArray(block, 'tags'),
        featured: extractBoolean(block, 'featured'),
        featuredOrder: extractNumber(block, 'featuredOrder'),
        visualTone: extractString(block, 'visualTone'),
        order: index + 1,
      };
    })
    .filter(Boolean);
}

function buildExtraPosters(count, startIndex = 1) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(startIndex + index).padStart(2, '0');
    return {
      id: `demo-extra-${number}`,
      title: `演示封面 ${number}`,
      subtitle: '备用素材',
      category: index % 2 ? '都市' : '悬疑',
      background: index % 3 ? '现代' : '古风',
      theme: index % 2 ? '甜宠' : '逆袭',
      audience: index % 2 ? '女频' : '男频',
      setting: index % 2 ? ['甜宠', '先婚后爱'] : ['打脸虐渣', '马甲'],
      tags: index % 2 ? ['甜宠', '都市', '热播'] : ['逆袭', '悬疑', '高能'],
      featured: false,
      order: 10_000 + index,
      visualTone: '短剧平台备用演示封面，强光影，橙红主色，电影海报感',
      isExtra: true,
    };
  });
}

function pickTargets(dramas) {
  const featured = dramas
    .filter((drama) => drama.featured && Number.isFinite(drama.featuredOrder))
    .sort((first, second) => Number(first.featuredOrder) - Number(second.featuredOrder));

  const heroTargets = [...featured];
  for (const drama of dramas) {
    if (heroTargets.length >= args.featured) break;
    if (!heroTargets.some((item) => item.id === drama.id)) heroTargets.push(drama);
  }

  const requestedPosterCount = args.all ? Math.max(args.posters, dramas.length) : args.posters;
  const posterTargets = dramas.slice(0, Math.min(dramas.length, requestedPosterCount));
  if (posterTargets.length < requestedPosterCount) {
    posterTargets.push(...buildExtraPosters(requestedPosterCount - posterTargets.length));
  }

  return {
    heroTargets: heroTargets.slice(0, args.featured),
    posterTargets,
  };
}

function createPrompt(drama, kind) {
  const ratio = kind === 'poster' ? 'vertical 9:16 streaming drama poster' : 'wide 16:9 hero background';
  const composition =
    kind === 'poster'
      ? 'central fictional protagonist silhouette, dramatic wardrobe shape, premium poster composition, clean lower area'
      : 'large cinematic environment, protagonist silhouette on the right, clean dark negative space on the left for UI text';
  return [
    `Create an original ${ratio} for a fictional Chinese short-drama website.`,
    `Drama: ${drama.title}. Subtitle: ${drama.subtitle || 'short drama'}.`,
    `Genre and tone: ${[drama.category, drama.background, drama.theme, drama.audience, drama.visualTone].filter(Boolean).join(', ')}.`,
    `Story settings: ${(drama.setting || []).join(', ')}. Tags: ${(drama.tags || []).join(', ')}.`,
    composition,
    'Dark immersive entertainment style, orange-red accent glow, cinematic contrast, strong depth, high-end short drama platform.',
    'No real people, no celebrity likeness, no existing IP, no platform logo, no readable text, no watermark.',
  ].join(' ');
}

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const palettes = [
  [
    [255, 95, 56],
    [120, 25, 66],
    [12, 12, 18],
    [255, 197, 122],
  ],
  [
    [255, 45, 85],
    [80, 24, 112],
    [11, 15, 29],
    [255, 117, 76],
  ],
  [
    [232, 150, 72],
    [80, 42, 28],
    [10, 8, 12],
    [255, 218, 158],
  ],
  [
    [78, 168, 255],
    [92, 24, 115],
    [7, 10, 22],
    [255, 88, 64],
  ],
  [
    [230, 65, 45],
    [53, 63, 102],
    [8, 8, 13],
    [246, 183, 92],
  ],
];

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mix(first, second, ratio) {
  return first.map((value, index) => value * (1 - ratio) + second[index] * ratio);
}

function addColor(color, accent, amount) {
  color[0] += accent[0] * amount;
  color[1] += accent[1] * amount;
  color[2] += accent[2] * amount;
}

function radial(x, y, centerX, centerY, radius) {
  const distance = Math.hypot(x - centerX, y - centerY);
  return Math.max(0, 1 - distance / radius);
}

function smoothStep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function drawFallbackPixels(drama, kind) {
  const poster = kind === 'poster';
  const width = poster ? 540 : 1280;
  const height = poster ? 960 : 720;
  const seed = hashString(`${kind}:${drama.id}:${drama.title}`);
  const random = seededRandom(seed);
  const palette = palettes[seed % palettes.length];
  const centerX = poster ? 0.48 + (random() - 0.5) * 0.08 : 0.68 + (random() - 0.5) * 0.08;
  const centerY = poster ? 0.36 + (random() - 0.5) * 0.06 : 0.42 + (random() - 0.5) * 0.08;
  const glowX = poster ? 0.68 + random() * 0.25 : 0.72 + random() * 0.22;
  const glowY = 0.16 + random() * 0.36;
  const lineAngle = -0.32 + random() * 0.7;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const ny = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const nx = x / (width - 1);
      const base = mix(palette[2], mix(palette[0], palette[1], nx * 0.64 + ny * 0.32), 0.42 + ny * 0.3);
      const warmGlow = radial(nx, ny, glowX, glowY, poster ? 0.52 : 0.64);
      const edgeGlow = radial(nx, ny, 0.08, 0.86, poster ? 0.55 : 0.76);
      const stageGlow = radial(nx, ny, centerX, centerY, poster ? 0.38 : 0.5);
      const vignette = Math.pow(Math.hypot(nx - 0.5, ny - 0.52), 1.2);
      const slash = Math.max(0, 1 - Math.abs((ny - 0.22) - (nx - 0.5) * lineAngle) / 0.018);
      const blockNoise = ((hashString(`${seed}:${x >> 3}:${y >> 3}`) % 100) / 100 - 0.5) * 9;

      addColor(base, palette[0], warmGlow * 0.55);
      addColor(base, palette[3], edgeGlow * 0.18);
      addColor(base, palette[1], stageGlow * 0.24);
      addColor(base, palette[3], slash * 0.16);

      if (poster) {
        const body = Math.pow((nx - centerX) / 0.18, 2) + Math.pow((ny - 0.58) / 0.34, 2);
        const head = Math.pow((nx - centerX) / 0.1, 2) + Math.pow((ny - 0.31) / 0.11, 2);
        const shoulder = Math.pow((nx - centerX) / 0.28, 2) + Math.pow((ny - 0.52) / 0.13, 2);
        const silhouette = Math.max(0, 1 - Math.min(body, head * 0.9, shoulder * 0.8));
        base[0] *= 1 - silhouette * 0.58;
        base[1] *= 1 - silhouette * 0.62;
        base[2] *= 1 - silhouette * 0.5;

        const frame = smoothStep(0.08, 0.1, nx) * smoothStep(0.92, 0.9, nx) * smoothStep(0.07, 0.09, ny);
        addColor(base, palette[3], frame * 0.03);
        if (nx > 0.16 && nx < 0.84 && Math.abs(ny - 0.1) < 0.0025) addColor(base, palette[3], 0.35);
        if (nx > 0.2 && nx < 0.78 && Math.abs(ny - 0.84) < 0.003) addColor(base, palette[0], 0.22);
      } else {
        const heroBody = Math.pow((nx - centerX) / 0.14, 2) + Math.pow((ny - 0.56) / 0.42, 2);
        const heroHead = Math.pow((nx - centerX) / 0.07, 2) + Math.pow((ny - 0.29) / 0.09, 2);
        const silhouette = Math.max(0, 1 - Math.min(heroBody, heroHead));
        base[0] *= 1 - silhouette * 0.56;
        base[1] *= 1 - silhouette * 0.62;
        base[2] *= 1 - silhouette * 0.45;

        const leftReadability = smoothStep(0.54, 0.08, nx);
        base[0] *= 1 - leftReadability * 0.42;
        base[1] *= 1 - leftReadability * 0.44;
        base[2] *= 1 - leftReadability * 0.38;
        if (nx > 0.49 && nx < 0.9 && Math.abs(ny - 0.78) < 0.003) addColor(base, palette[3], 0.18);
      }

      base[0] = base[0] * (1 - vignette * 0.58) + blockNoise;
      base[1] = base[1] * (1 - vignette * 0.62) + blockNoise;
      base[2] = base[2] * (1 - vignette * 0.55) + blockNoise;

      const offset = (y * width + x) * 4;
      data[offset] = clamp(base[0]);
      data[offset + 1] = clamp(base[1]);
      data[offset + 2] = clamp(base[2]);
      data[offset + 3] = 255;
    }
  }

  return { width, height, data };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng({ width, height, data }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const dataStart = y * stride;
    filtered[rowStart] = 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? data[dataStart + x - 4] : 0;
      filtered[rowStart + 1 + x] = (data[dataStart + x] - left + 256) & 0xff;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(filtered, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateFallbackImage(drama, kind) {
  return encodePng(drawFallbackPixels(drama, kind));
}

async function writeImage(drama, kind, outputPath, failures) {
  if (!args.force && (await exists(outputPath))) {
    console.log(`[chengying] Skip existing ${kind}: ${path.relative(rootDir, outputPath)}`);
    return { method: 'existing', source: 'existing' };
  }

  if (useOpenAI) {
    const size = kind === 'poster' ? '1024x1536' : '1536x1024';
    try {
      console.log(`[chengying] OpenAI ${kind}: ${drama.title}`);
      console.log(`[chengying] OpenAI request context: dramaId=${drama.id}, kind=${kind}, model=${requestedModel}, size=${size}, quality=${args.quality}, hasKey=${Boolean(apiKey)}`);
      const result = await generateOpenAIImageWithDiagnostics({
        apiKey,
        requestedModel,
        prompt: createPrompt(drama, kind),
        size,
        quality: args.quality,
        dramaId: drama.id,
        kind,
        allowModelFallback: requestedModel === DEFAULT_IMAGE_MODEL,
        onAttemptFailure(diagnostic, nextModel) {
          console.warn(formatOpenAIImageDiagnostic(diagnostic, nextModel));
        },
      });
      await writeFile(outputPath, result.buffer);
      console.log(`[chengying] OpenAI ${kind} OK: ${drama.title} (${result.source})`);
      return { method: 'openai', source: result.source };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const diagnostics = Array.isArray(error?.diagnostics) ? error.diagnostics : [];
      failures.push({ id: drama.id, kind, message, diagnostics });
      console.warn(`[chengying] OpenAI failed for ${drama.id} ${kind}. Fallback will be used.`);
    }
  }

  console.log(`[chengying] Local fallback ${kind}: ${drama.title}`);
  await writeFile(outputPath, generateFallbackImage(drama, kind));
  return { method: 'fallback', source: 'local-fallback' };
}

async function main() {
  await mkdir(posterDir, { recursive: true });
  await mkdir(heroDir, { recursive: true });

  const dramas = await readMockDramas();
  if (!dramas.length) throw new Error('No mock dramas found in apps/web/src/data/mockDramas.ts');

  const { heroTargets, posterTargets } = pickTargets(dramas);
  const failures = [];
  const assets = {};
  let fallbackCount = 0;
  let openaiCount = 0;
  let existingCount = 0;

  for (const drama of posterTargets) {
    const posterPath = path.join(posterDir, `${drama.id}.png`);
    const result = await writeImage(drama, 'poster', posterPath, failures);
    if (result.method === 'fallback') fallbackCount += 1;
    if (result.method === 'openai') openaiCount += 1;
    if (result.method === 'existing') existingCount += 1;
    assets[drama.id] = {
      ...(assets[drama.id] || {}),
      title: drama.title,
      poster: `/demo-assets/posters/${drama.id}.png`,
      posterSource: result.source,
      posterIsExtra: Boolean(drama.isExtra),
    };
  }

  for (const drama of heroTargets) {
    const heroPath = path.join(heroDir, `${drama.id}.png`);
    const result = await writeImage(drama, 'hero', heroPath, failures);
    if (result.method === 'fallback') fallbackCount += 1;
    if (result.method === 'openai') openaiCount += 1;
    if (result.method === 'existing') existingCount += 1;
    assets[drama.id] = {
      ...(assets[drama.id] || {}),
      title: drama.title,
      hero: `/demo-assets/hero/${drama.id}.png`,
      heroSource: result.source,
    };
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    summary: {
      posters: posterTargets.length,
      heroes: heroTargets.length,
      failed: failures.length,
      fallbackOnly: !useOpenAI,
      attemptedOpenAI: useOpenAI,
      usedOpenAI: openaiCount > 0,
      requestedModel,
      fallbackModel: 'gpt-image-1',
      quality: args.quality,
      fallbackGenerated: fallbackCount,
      openaiGenerated: openaiCount,
      existing: existingCount,
      requestedPosters: args.posters,
      requestedHeroes: args.featured,
      mockDramaCount: dramas.length,
    },
    assets,
    featured: heroTargets.map((drama) => ({
      id: drama.id,
      title: drama.title,
      poster: `/demo-assets/posters/${drama.id}.png`,
      hero: `/demo-assets/hero/${drama.id}.png`,
    })),
    failures,
  };

  await writeFile(path.join(assetRoot, 'generated-assets.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('');
  console.log('[chengying] Demo asset generation complete.');
  console.log(`[chengying] Posters: ${posterTargets.length}, heroes: ${heroTargets.length}, failures: ${failures.length}`);
  console.log(`[chengying] Manifest: ${path.relative(rootDir, path.join(assetRoot, 'generated-assets.json'))}`);
  if (!apiKey && !args.fallbackOnly) {
    console.log('[chengying] OPENAI_API_KEY is not set, so local fallback PNG assets were generated.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
