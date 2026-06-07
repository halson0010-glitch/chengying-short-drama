import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { requireUser } from '../lib/userAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { sanitizeJsonValue } from '../lib/privacy.js';

export const paymentRouter = Router();

const paymentRateLimit = rateLimit({
  windowMs: config.rateLimit.paymentWindowMs,
  max: config.rateLimit.paymentMax,
  keyPrefix: 'payments',
  message: 'Too many payment requests. Please try again later.',
});

const checkoutSchema = z.object({
  amount: z.coerce.number().int().min(100).max(999_999),
  currency: z.string().trim().min(3).max(6).default('cny'),
  successUrl: z.string().trim().url().max(1000).optional(),
  cancelUrl: z.string().trim().url().max(1000).optional(),
});

function getUserId(res: Response) {
  return (res.locals.user as { sub?: string } | undefined)?.sub;
}

function getClientIpHash(req: Request) {
  const value = req.header('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

async function createStripeCheckoutSession(input: {
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  paymentId: string;
}) {
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  params.set('client_reference_id', input.paymentId);
  params.set('metadata[paymentRecordId]', input.paymentId);
  params.set('metadata[userId]', input.userId);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
  params.set('line_items[0][price_data][unit_amount]', String(input.amount));
  params.set('line_items[0][price_data][product_data][name]', 'Chengying short drama membership');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe checkout failed with status ${response.status}`);
  }
  return data;
}

paymentRouter.use(requireUser);

paymentRouter.get('/me', async (_req, res) => {
  const userId = getUserId(res);
  const payments = await prisma.paymentRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({
    payments: payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    })),
  });
});

paymentRouter.post('/stripe/checkout', paymentRateLimit, validateBody(checkoutSchema), async (req, res) => {
  const userId = getUserId(res);
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const successUrl = req.body.successUrl || config.stripe.successUrl || `${config.publicWebBaseUrl}/payment/success`;
  const cancelUrl = req.body.cancelUrl || config.stripe.cancelUrl || `${config.publicWebBaseUrl}/payment/cancel`;
  const payment = await prisma.paymentRecord.create({
    data: {
      userId,
      provider: 'stripe',
      amount: req.body.amount,
      currency: req.body.currency.toLowerCase(),
      status: config.stripe.secretKey ? 'created' : 'not_configured',
      metadataJson: JSON.stringify({
        successUrl,
        cancelUrl,
        source: 'web',
        userAgent: req.header('user-agent') || '',
        ipHash: getClientIpHash(req),
      }),
    },
  });

  if (!config.stripe.secretKey) {
    return res.status(501).json({
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.',
      paymentId: payment.id,
      provider: 'stripe',
      checkoutUrl: null,
    });
  }

  const session = await createStripeCheckoutSession({
    amount: payment.amount,
    currency: payment.currency,
    successUrl,
    cancelUrl,
    userId,
    paymentId: payment.id,
  });

  await prisma.paymentRecord.update({
    where: { id: payment.id },
    data: {
      providerSessionId: session.id ?? null,
      checkoutUrl: session.url ?? null,
      status: 'checkout_created',
    },
  });

  return res.json({
    paymentId: payment.id,
    provider: 'stripe',
    checkoutUrl: session.url,
    sessionId: session.id,
    status: 'checkout_created',
  });
});

function verifyStripeSignature(rawBody: Buffer, signature: string) {
  if (!config.stripe.webhookSecret) return true;
  const timestamp = signature.match(/t=([^,]+)/)?.[1];
  const expected = signature.match(/v1=([^,]+)/)?.[1];
  if (!timestamp || !expected) return false;
  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const digest = crypto.createHmac('sha256', config.stripe.webhookSecret).update(signedPayload).digest('hex');
  if (digest.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
}

type StripeEventObject = Record<string, unknown> & {
  id?: string;
  client_reference_id?: string;
  payment_intent?: string | { id?: string };
  status?: string;
  payment_method_types?: string[];
  payment_method?: string;
  customer?: string;
  customer_email?: string;
  customer_details?: { email?: string };
  metadata?: Record<string, string>;
  last_payment_error?: { code?: string; message?: string; payment_method?: { type?: string } };
  billing_details?: { email?: string };
};

type StripeWebhookEvent = {
  id?: string;
  type?: string;
  data?: { object?: StripeEventObject };
};

function getPaymentIntentId(object?: StripeEventObject) {
  if (!object) return undefined;
  if (typeof object.payment_intent === 'string') return object.payment_intent;
  return object.payment_intent?.id;
}

function getPaymentMethod(object?: StripeEventObject) {
  return object?.payment_method_types?.[0] || object?.last_payment_error?.payment_method?.type || object?.payment_method;
}

async function findPaymentRecord(object?: StripeEventObject) {
  const paymentId = object?.client_reference_id || object?.metadata?.paymentRecordId;
  if (paymentId) {
    const payment = await prisma.paymentRecord.findUnique({ where: { id: paymentId } });
    if (payment) return payment;
  }

  const sessionId = object?.id;
  const paymentIntentId = getPaymentIntentId(object) || object?.id;
  if (!sessionId && !paymentIntentId) return null;
  return prisma.paymentRecord.findFirst({
    where: {
      OR: [
        ...(sessionId ? [{ providerSessionId: sessionId }] : []),
        ...(paymentIntentId ? [{ providerPaymentId: paymentIntentId }] : []),
      ],
    },
  });
}

async function recordPaymentEvent(event: StripeWebhookEvent, paymentRecordId?: string, status?: string) {
  const eventId = event.id || '';
  if (eventId) {
    const existing = await prisma.paymentEvent.findUnique({
      where: { provider_eventId: { provider: 'stripe', eventId } },
    });
    if (existing) return { duplicate: true, event: existing };
  }

  const created = await prisma.paymentEvent.create({
    data: {
      paymentRecordId,
      provider: 'stripe',
      eventType: event.type || 'unknown',
      eventId: eventId || null,
      status,
      payloadJson: JSON.stringify(sanitizeJsonValue(event)),
    },
  });
  return { duplicate: false, event: created };
}

async function recordPaymentAnalytics(event: string, paymentRecordId: string | undefined, payload: Record<string, unknown>) {
  await prisma.analyticsEvent.create({
    data: {
      event,
      path: '/api/payments/stripe/webhook',
      device: 'server',
      payloadJson: JSON.stringify(sanitizeJsonValue({ paymentRecordId, provider: 'stripe', ...payload })),
    },
  });
}

async function grantMembership(paymentRecordId: string, userId?: string | null) {
  if (!userId) return;
  const existing = await prisma.userEntitlement.findFirst({
    where: { sourcePaymentId: paymentRecordId, type: 'membership' },
  });
  if (existing) return;
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  await prisma.userEntitlement.create({
    data: {
      userId,
      type: 'membership',
      status: 'active',
      startsAt,
      endsAt,
      sourcePaymentId: paymentRecordId,
    },
  });
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.header('stripe-signature') || '';
  if (!verifyStripeSignature(rawBody, signature)) return res.status(400).json({ message: 'Invalid Stripe signature' });

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as StripeWebhookEvent;
  } catch {
    return res.status(400).json({ message: 'Invalid Stripe webhook payload' });
  }
  const object = event.data?.object;
  const payment = await findPaymentRecord(object);
  const paymentEvent = await recordPaymentEvent(event, payment?.id, object?.status);

  if (paymentEvent.duplicate) return res.json({ received: true, duplicate: true });

  if (!payment) {
    await recordPaymentAnalytics('payment_webhook_received', undefined, { eventId: event.id, eventType: event.type });
    return res.json({ received: true, paymentRecordMatched: false });
  }

  await recordPaymentAnalytics('payment_webhook_verified', payment.id, { eventId: event.id, eventType: event.type });

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const providerPaymentId = getPaymentIntentId(object) || object?.id;
    const paidAt = new Date();
    await prisma.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        paidAt,
        providerSessionId: event.type === 'checkout.session.completed' ? object?.id ?? payment.providerSessionId : payment.providerSessionId,
        providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
        providerPaymentStatus: object?.status,
        paymentMethod: getPaymentMethod(object),
        providerCustomerEmail: object?.customer_details?.email || object?.customer_email || object?.billing_details?.email,
        providerCustomerId: typeof object?.customer === 'string' ? object.customer : undefined,
        rawWebhookEventId: event.id,
        rawWebhookType: event.type,
      },
    });
    await grantMembership(payment.id, payment.userId);
    await recordPaymentAnalytics('payment_paid', payment.id, {
      eventId: event.id,
      paymentMethod: getPaymentMethod(object),
      amount: payment.amount,
      currency: payment.currency,
    });
  } else if (event.type === 'checkout.session.expired') {
    await prisma.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        providerPaymentStatus: object?.status,
        rawWebhookEventId: event.id,
        rawWebhookType: event.type,
      },
    });
    await recordPaymentAnalytics('payment_expired', payment.id, { eventId: event.id });
  } else if (event.type === 'payment_intent.payment_failed') {
    await prisma.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        failedAt: new Date(),
        providerPaymentId: object?.id ?? payment.providerPaymentId,
        providerPaymentStatus: object?.status,
        failureCode: object?.last_payment_error?.code,
        failureMessage: object?.last_payment_error?.message,
        paymentMethod: getPaymentMethod(object),
        rawWebhookEventId: event.id,
        rawWebhookType: event.type,
      },
    });
    await recordPaymentAnalytics('payment_failed', payment.id, {
      eventId: event.id,
      failureCode: object?.last_payment_error?.code,
    });
  } else if (event.type === 'charge.refunded') {
    await prisma.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: 'refunded',
        rawWebhookEventId: event.id,
        rawWebhookType: event.type,
      },
    });
    await recordPaymentAnalytics('payment_refunded', payment.id, { eventId: event.id });
  } else if (event.type === 'charge.dispute.created') {
    await prisma.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: 'disputed',
        rawWebhookEventId: event.id,
        rawWebhookType: event.type,
      },
    });
    await recordPaymentAnalytics('payment_disputed', payment.id, { eventId: event.id });
  }

  return res.json({ received: true, paymentRecordMatched: true });
}
