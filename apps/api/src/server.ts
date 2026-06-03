import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { adminRouter } from './routes/admin.js';
import { adminAnalyticsRouter, analyticsRouter } from './routes/analytics.js';
import { aiRouter } from './routes/ai.js';
import { adminDashboardRouter } from './routes/dashboard.js';
import { adminDemoAssetsRouter } from './routes/demoAssets.js';
import { authRouter } from './routes/auth.js';
import { cloudRouter } from './routes/cloud.js';
import { paymentRouter, stripeWebhookHandler } from './routes/payments.js';
import { publicRouter } from './routes/public.js';
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

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/cloud', cloudRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/admin/upload', uploadRouter);
app.use('/api/admin/ai', aiRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/demo-assets', adminDemoAssetsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = config.isProduction ? 'Internal server error' : error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ message });
});

app.listen(config.port, () => {
  console.log(`Chengying API is running at http://localhost:${config.port}`);
});
