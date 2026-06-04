import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'apps', 'web', 'public', 'demo-assets', 'generated-assets.json');
const posterDir = path.join(rootDir, 'apps', 'web', 'public', 'demo-assets', 'posters');
const heroDir = path.join(rootDir, 'apps', 'web', 'public', 'demo-assets', 'hero');

const mappings = [
  { index: 1, id: 'ember-vow', title: '暮色签收', kind: 'poster', target: 'posters/ember-vow.png' },
  { index: 2, id: 'ember-vow', title: '暮色签收', kind: 'hero', target: 'hero/ember-vow.png' },
  { index: 3, id: 'neon-crown', title: '霓虹之上', kind: 'poster', target: 'posters/neon-crown.png' },
  { index: 4, id: 'neon-crown', title: '霓虹之上', kind: 'hero', target: 'hero/neon-crown.png' },
  { index: 5, id: 'hidden-chairman', title: '沉默股东', kind: 'poster', target: 'posters/hidden-chairman.png' },
  { index: 6, id: 'hidden-chairman', title: '沉默股东', kind: 'hero', target: 'hero/hidden-chairman.png' },
  { index: 7, id: 'moon-scroll', title: '月下诏书', kind: 'poster', target: 'posters/moon-scroll.png' },
  { index: 8, id: 'moon-scroll', title: '月下诏书', kind: 'hero', target: 'hero/moon-scroll.png' },
  { index: 9, id: 'missing-minute', title: '消失的一分钟', kind: 'poster', target: 'posters/missing-minute.png' },
  { index: 10, id: 'missing-minute', title: '消失的一分钟', kind: 'hero', target: 'hero/missing-minute.png' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--src') {
      result.src = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--src=')) {
      result.src = arg.slice('--src='.length);
    }
  }
  return result;
}

function getBracketIndex(fileName) {
  const match = fileName.match(/\((\d+)\)\.png$/i);
  return match ? Number(match[1]) : undefined;
}

function publicPath(target) {
  return `/demo-assets/${target.replaceAll('\\', '/')}`;
}

function toPortablePath(value) {
  return value.replaceAll('\\', '/');
}

async function main() {
  const { src } = parseArgs();
  if (!src) {
    throw new Error('Missing --src. Example: npm run import:featured-assets -- --src "C:\\\\path\\\\to\\\\pics"');
  }

  const sourceDir = path.resolve(src);
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const pngFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => ({ name: entry.name, index: getBracketIndex(entry.name), fullPath: path.join(sourceDir, entry.name) }))
    .filter((file) => Number.isInteger(file.index))
    .sort((first, second) => Number(first.index) - Number(second.index));

  if (pngFiles.length < mappings.length) {
    throw new Error(`Source directory has ${pngFiles.length} numbered PNG files, missing ${mappings.length - pngFiles.length}.`);
  }

  const byIndex = new Map(pngFiles.map((file) => [file.index, file]));
  const missing = mappings.map((item) => item.index).filter((index) => !byIndex.has(index));
  if (missing.length) {
    throw new Error(`Missing numbered PNG files: ${missing.map((index) => `(${index})`).join(', ')}`);
  }

  await mkdir(posterDir, { recursive: true });
  await mkdir(heroDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const assets = {};
  const imported = [];

  for (const item of mappings) {
    const source = byIndex.get(item.index);
    const targetPath = path.join(rootDir, 'apps', 'web', 'public', 'demo-assets', item.target);
    await copyFile(source.fullPath, targetPath);

    const current = { ...(assets[item.id] ?? {}), title: item.title };
    if (item.kind === 'poster') {
      current.poster = publicPath(item.target);
      current.posterSource = 'manual-import';
      current.posterVersion = generatedAt;
      current.posterIsExtra = false;
    } else {
      current.hero = publicPath(item.target);
      current.heroSource = 'manual-import';
      current.heroVersion = generatedAt;
    }
    current.version = generatedAt;
    assets[item.id] = current;

    imported.push({
      index: item.index,
      dramaId: item.id,
      title: item.title,
      kind: item.kind,
      source: toPortablePath(source.fullPath),
      target: toPortablePath(path.relative(rootDir, targetPath)),
    });
  }

  const nextManifest = {
    generatedAt,
    summary: {
      heroes: 5,
      posters: 5,
      source: 'manual-import',
      importSourceDir: toPortablePath(sourceDir),
      manualImported: mappings.length,
      fallbackOnly: false,
      usedOpenAI: false,
    },
    assets,
    featured: [
      { id: 'ember-vow', title: '暮色签收', poster: '/demo-assets/posters/ember-vow.png', hero: '/demo-assets/hero/ember-vow.png' },
      { id: 'neon-crown', title: '霓虹之上', poster: '/demo-assets/posters/neon-crown.png', hero: '/demo-assets/hero/neon-crown.png' },
      {
        id: 'hidden-chairman',
        title: '沉默股东',
        poster: '/demo-assets/posters/hidden-chairman.png',
        hero: '/demo-assets/hero/hidden-chairman.png',
      },
      { id: 'moon-scroll', title: '月下诏书', poster: '/demo-assets/posters/moon-scroll.png', hero: '/demo-assets/hero/moon-scroll.png' },
      {
        id: 'missing-minute',
        title: '消失的一分钟',
        poster: '/demo-assets/posters/missing-minute.png',
        hero: '/demo-assets/hero/missing-minute.png',
      },
    ],
    importLog: imported,
  };

  await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');

  console.log('[chengying] Featured assets imported.');
  console.log(`[chengying] Source: ${sourceDir}`);
  for (const item of imported) {
    console.log(`[chengying] (${item.index}) ${item.title} ${item.kind}: ${item.source} -> ${item.target}`);
  }
  console.log(`[chengying] Manifest updated: ${path.relative(rootDir, manifestPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
