import { spawn, spawnSync } from 'node:child_process';

function commandExists(command) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
  return result.status === 0;
}

function printCliInstallHelp() {
  console.log('[chengying] 未检测到 Vercel CLI，请先执行：');
  console.log('  npm i -g vercel');
  console.log('  vercel login');
}

function printProjectHelp() {
  console.log('[chengying] 如果 Vercel CLI 要求选择或创建项目，请使用：');
  console.log('  Project Name: chengying-short-drama-admin');
  console.log('  Framework Preset: Vite');
  console.log('  Root Directory: .');
  console.log('  Install Command: npm install');
  console.log('  Build Command: npm run build:shared && npm run build:admin');
  console.log('  Output Directory: apps/admin/dist');
  console.log('  Environment Variables: VITE_API_BASE_URL=https://你的API域名, VITE_PUBLIC_BASE=/');
}

function ensureLoggedIn() {
  const result = spawnSync('vercel', ['whoami'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status === 0) {
    const user = result.stdout.trim();
    if (user) console.log(`[chengying] Vercel CLI 已登录：${user}`);
    return true;
  }
  console.log('[chengying] Vercel CLI 尚未登录，请先执行：');
  console.log('  vercel login');
  return false;
}

function runInherited(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runAndCapture(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on('close', (code) => resolve({ code, output }));
  });
}

function findDeploymentUrl(output) {
  const urls = output.match(/https:\/\/[^\s]+/g) ?? [];
  return urls.find((url) => /vercel\.app|\.vercel\./i.test(url)) ?? urls.at(-1) ?? '';
}

if (!commandExists('vercel')) {
  printCliInstallHelp();
  process.exit(1);
}

if (!ensureLoggedIn()) process.exit(1);

console.log('[chengying] 开始构建后台静态资源...');
runInherited('npm', ['run', 'build:shared']);
runInherited('npm', ['run', 'build:admin']);

printProjectHelp();
console.log('[chengying] 开始部署后台到 Vercel Production...');
const { code, output } = await runAndCapture('vercel', ['deploy', '--prod']);
if (code !== 0) process.exit(code ?? 1);

const url = findDeploymentUrl(output);
console.log(`[chengying] 后台部署完成${url ? `：${url}` : '。请查看上方 Vercel 输出获取 URL。'}`);
