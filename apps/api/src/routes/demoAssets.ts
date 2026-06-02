import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

export const adminDemoAssetsRouter = Router();

type DemoAssetsManifest = {
  generatedAt?: string;
  summary?: Record<string, unknown>;
  assets?: Record<string, { title?: string; poster?: string; hero?: string; posterIsExtra?: boolean }>;
  failures?: Array<{ id: string; kind: string; message: string }>;
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const assetRoot = path.join(projectRoot, 'apps', 'web', 'public', 'demo-assets');
const manifestPath = path.join(assetRoot, 'generated-assets.json');

async function readManifest(): Promise<DemoAssetsManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as DemoAssetsManifest;
  } catch {
    return null;
  }
}

async function countPngFiles(directory: string) {
  try {
    const files = await readdir(directory);
    return files.filter((file) => file.toLowerCase().endsWith('.png')).length;
  } catch {
    return 0;
  }
}

function publicPathToDiskPath(publicPath?: string) {
  if (!publicPath?.startsWith('/demo-assets/')) return undefined;
  return path.join(assetRoot, publicPath.replace('/demo-assets/', '').replace(/\//g, path.sep));
}

async function pathExists(publicPath?: string) {
  const diskPath = publicPathToDiskPath(publicPath);
  if (!diskPath) return false;
  try {
    await readFile(diskPath);
    return true;
  } catch {
    return false;
  }
}

adminDemoAssetsRouter.use(requireAdmin);

adminDemoAssetsRouter.get('/', async (_req, res) => {
  const manifest = await readManifest();
  const heroFiles = await countPngFiles(path.join(assetRoot, 'hero'));
  const posterFiles = await countPngFiles(path.join(assetRoot, 'posters'));
  const assets = Object.entries(manifest?.assets ?? {});

  const items = await Promise.all(
    assets.map(async ([id, asset]) => {
      const hasPoster = await pathExists(asset.poster);
      const hasHero = asset.hero ? await pathExists(asset.hero) : false;
      return {
        id,
        title: asset.title || id,
        poster: asset.poster,
        hero: asset.hero,
        posterIsExtra: Boolean(asset.posterIsExtra),
        hasPoster,
        hasHero,
        missing: [!hasPoster ? 'poster' : '', asset.hero && !hasHero ? 'hero' : ''].filter(Boolean),
      };
    }),
  );

  res.json({
    generatedAt: manifest?.generatedAt,
    summary: manifest?.summary ?? {},
    fallbackOnly: Boolean(manifest?.summary?.fallbackOnly),
    heroFiles,
    posterFiles,
    manifestExists: Boolean(manifest),
    items,
    missingItems: items.filter((item) => item.missing.length > 0),
    failures: manifest?.failures ?? [],
  });
});
