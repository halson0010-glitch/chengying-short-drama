import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'apps', 'web', 'dist');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');
const nojekyllPath = path.join(distDir, '.nojekyll');

async function ensureFile(filePath, label) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error(`${label} is not a file: ${filePath}`);
  } catch (error) {
    throw new Error(`${label} not found. Run npm run build:web first. Missing: ${filePath}`);
  }
}

async function listDistFiles() {
  const entries = await readdir(distDir, { withFileTypes: true });
  return entries.map((entry) => `${entry.isDirectory() ? 'dir ' : 'file'} ${entry.name}`).sort();
}

async function main() {
  await ensureFile(indexPath, 'apps/web/dist/index.html');
  await mkdir(distDir, { recursive: true });
  await copyFile(indexPath, notFoundPath);
  await writeFile(nojekyllPath, '');

  console.log('[chengying] GitHub Pages preparation complete.');
  console.log(`[chengying] Copied ${path.relative(rootDir, indexPath)} -> ${path.relative(rootDir, notFoundPath)}`);
  console.log(`[chengying] Created ${path.relative(rootDir, nojekyllPath)}`);
  console.log('[chengying] Dist entries:');
  for (const entry of await listDistFiles()) {
    console.log(`  - ${entry}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
