import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readEnvFile() {
  const envPath = path.join(rootDir, 'apps', 'api', '.env');
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
      }),
  );
}

function getValue(env, key) {
  return process.env[key] || env[key] || '';
}

function status(label, value) {
  console.log(`[chengying] ${label}: ${value ? 'configured' : 'missing'}`);
}

const env = readEnvFile();
status('ALIYUN_OSS_REGION', getValue(env, 'ALIYUN_OSS_REGION'));
status('ALIYUN_OSS_BUCKET', getValue(env, 'ALIYUN_OSS_BUCKET'));
status('ALIYUN_ACCESS_KEY_ID', getValue(env, 'ALIYUN_ACCESS_KEY_ID'));
status('ALIYUN_ACCESS_KEY_SECRET', getValue(env, 'ALIYUN_ACCESS_KEY_SECRET'));

console.log('[chengying] Do not expose long-term AccessKey values to the web frontend.');
console.log('[chengying] Production uploads should use backend signing, STS temporary credentials, OSS + CDN, or presigned URLs.');
