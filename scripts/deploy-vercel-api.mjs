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
  console.log('[chengying] 部署前请先在 Vercel 项目中配置环境变量，变量名如下，不要写入真实 secret 到代码：');
  console.log('  NODE_ENV=production');
  console.log('  DATABASE_URL=');
  console.log('  JWT_SECRET=');
  console.log('  PASSWORD_HASH_ROUNDS=12');
  console.log('  CORS_ORIGINS=https://前台域名,https://后台域名');
  console.log('  PUBLIC_API_BASE_URL=https://API域名');
  console.log('  PUBLIC_WEB_BASE_URL=https://前台域名');
  console.log('  PUBLIC_ADMIN_BASE_URL=https://后台域名');
  console.log('[chengying] 如果 Vercel CLI 要求选择或创建项目，请使用：');
  console.log('  Project Name: chengying-short-drama-api');
  console.log('  Root Directory: .');
  console.log('  Build Command: npm run build:shared && npm run build:api');
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

printProjectHelp();
console.log('[chengying] 开始构建临时 API...');
runInherited('npm', ['run', 'build:shared']);
runInherited('npm', ['run', 'build:api']);

console.log('[chengying] 开始部署临时 API 到 Vercel Production...');
const { code, output } = await runAndCapture('vercel', ['deploy', '--prod', '--local-config', 'vercel.api.json']);
if (code !== 0) process.exit(code ?? 1);

const url = findDeploymentUrl(output);
console.log(`[chengying] 临时 API 部署完成${url ? `：${url}` : '。请查看上方 Vercel 输出获取 URL。'}`);
