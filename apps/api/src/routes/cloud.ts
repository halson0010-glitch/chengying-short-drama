import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { getAliyunIntegrationStatus } from '../lib/cloudProviders.js';
import { requireUser } from '../lib/userAuth.js';
import { validateBody } from '../middleware/validate.js';

export const cloudRouter = Router();

const presignPlaceholderSchema = z.object({
  filename: z.string().trim().min(1).max(240),
  contentType: z.string().trim().min(1).max(120),
  purpose: z.enum(['poster', 'video', 'other']).default('other'),
});

cloudRouter.get('/aliyun/status', (_req, res) => {
  res.json(getAliyunIntegrationStatus());
});

cloudRouter.get('/aliyun/oss/sts', requireUser, (_req, res) => {
  const status = getAliyunIntegrationStatus();
  if (config.storageProvider !== 'aliyun-oss') {
    return res.status(501).json({
      message: 'Aliyun OSS STS is not enabled. Set STORAGE_PROVIDER=aliyun-oss before using OSS browser uploads.',
      storageProvider: config.storageProvider,
      configured: false,
    });
  }
  if (!status.storage.configured) {
    return res.status(501).json({
      message: 'Aliyun OSS is not configured. Set ALIYUN_OSS_REGION, ALIYUN_OSS_BUCKET and access keys first.',
      configured: false,
    });
  }

  return res.status(501).json({
    message: 'Aliyun STS SDK is not connected yet. Implement AssumeRole on the API before exposing browser uploads.',
    configured: true,
    region: config.aliyun.ossRegion,
    bucket: config.aliyun.ossBucket,
    uploadPrefix: 'chengying/uploads/',
    accessKeyId: null,
    accessKeySecret: null,
    stsToken: null,
    expiration: null,
  });
});

cloudRouter.post('/aliyun/oss/presign-placeholder', requireUser, validateBody(presignPlaceholderSchema), (req, res) => {
  const status = getAliyunIntegrationStatus();
  if (!status.storage.configured) {
    return res.status(501).json({
      message: 'Aliyun OSS is not configured. Set ALIYUN_OSS_REGION, ALIYUN_OSS_BUCKET and access keys first.',
      request: {
        filename: req.body.filename,
        contentType: req.body.contentType,
        purpose: req.body.purpose,
      },
    });
  }

  return res.json({
    provider: 'aliyun-oss',
    bucket: config.aliyun.ossBucket,
    region: config.aliyun.ossRegion,
    uploadUrl: null,
    fields: {},
    message: 'Placeholder only. Replace this with a real OSS STS or presigned URL implementation before production.',
  });
});
