import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { rateLimit } from './middleware/rateLimit.js';
import { adminRouter } from './routes/admin.js';
import { adminAnalyticsRouter, analyticsRouter } from './routes/analytics.js';
import { aiRouter } from './routes/ai.js';
import { adminDashboardRouter } from './routes/dashboard.js';
import { adminDemoAssetsRouter } from './routes/demoAssets.js';
import { adminPaymentsRouter } from './routes/adminPayments.js';
import { authRouter } from './routes/auth.js';
import { cloudRouter } from './routes/cloud.js';
import { engagementRouter } from './routes/engagement.js';
import { paymentRouter, stripeWebhookHandler } from './routes/payments.js';
import { publicRouter } from './routes/public.js';
import { rankingsRouter } from './routes/rankings.js';
import { uploadRouter } from './routes/upload.js';

fs.mkdirSync(config.uploadsDir, { recursive: true });

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin && !config.isProduction) return callback(null, true);
      if (origin && config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  }),
);
app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimit.globalWindowMs,
    max: config.rateLimit.globalMax,
    keyPrefix: 'global-api',
    message: 'Too many API requests. Please slow down.',
  }),
);
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '2mb' }), stripeWebhookHandler);
app.use(express.json({ limit: '2mb' }));
app.use(
  '/uploads',
  express.static(config.uploadsDir, {
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', config.isProduction ? 'public, max-age=31536000, immutable' : 'public, max-age=0');
    },
  }),
);

async function healthCheck(_req: express.Request, res: express.Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ ok: true, db: 'connected', time: new Date().toISOString() });
  } catch {
    return res.status(503).json({ ok: false, db: 'disconnected', time: new Date().toISOString() });
  }
}

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);
app.use('/api', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/me', engagementRouter);
app.use('/api/rankings', rankingsRouter);
app.use('/api/cloud', cloudRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/admin/upload', uploadRouter);
app.use('/api/admin/ai', aiRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/demo-assets', adminDemoAssetsRouter);
app.use('/api/admin/payments', adminPaymentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = config.isProduction ? 'Internal server error' : error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ message });
});

export default app;
