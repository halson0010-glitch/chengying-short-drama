import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = (process.env.CORS_ORIGINS || (isProduction ? '' : 'http://localhost:5173,http://localhost:5174'))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function assertProductionConfig() {
  if (!isProduction) return;

  const unsafeSecrets = new Set(['', 'dev-only-change-me', 'change-me-in-production']);
  const jwtSecret = process.env.JWT_SECRET || '';
  if (unsafeSecrets.has(jwtSecret)) {
    throw new Error('Refusing to start: production JWT_SECRET must be set to a strong secret.');
  }
  if ((process.env.ADMIN_PASSWORD || '') === 'admin123') {
    throw new Error('Refusing to start: production ADMIN_PASSWORD must not be admin123.');
  }
  if (!corsOrigins.length) {
    throw new Error('Refusing to start: production CORS_ORIGINS must be configured.');
  }
}

assertProductionConfig();

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
  corsOrigins,
  uploadsDir: path.resolve(apiRoot, 'uploads'),
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    imageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  aliyun: {
    ossRegion: process.env.ALIYUN_OSS_REGION || '',
    ossBucket: process.env.ALIYUN_OSS_BUCKET || '',
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    smsSignName: process.env.ALIYUN_SMS_SIGN_NAME || '',
    smsTemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    bucket: process.env.S3_BUCKET || '',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
  },
};
