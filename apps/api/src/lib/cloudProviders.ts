import { config } from '../config.js';

export function getAliyunIntegrationStatus() {
  const ossConfigured = Boolean(config.aliyun.ossRegion && config.aliyun.ossBucket && config.aliyun.accessKeyId);
  const smsConfigured = Boolean(config.aliyun.smsSignName && config.aliyun.smsTemplateCode && config.aliyun.accessKeyId);

  return {
    provider: 'aliyun',
    storage: {
      provider: 'oss',
      configured: ossConfigured,
      bucket: config.aliyun.ossBucket ? '[configured]' : '',
      region: config.aliyun.ossRegion,
    },
    sms: {
      configured: smsConfigured,
      signName: config.aliyun.smsSignName ? '[configured]' : '',
      templateCode: config.aliyun.smsTemplateCode ? '[configured]' : '',
    },
    payment: {
      provider: 'alipay',
      configured: false,
      message: 'Alipay is reserved as a separate payment provider adapter and is not enabled in this skeleton.',
    },
  };
}
