import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { requireUser } from '../lib/userAuth.js';
import { validateBody } from '../middleware/validate.js';

export const paymentRouter = Router();

const checkoutSchema = z.object({
  amount: z.coerce.number().int().min(100).max(999_999),
  currency: z.string().trim().min(3).max(6).default('cny'),
  successUrl: z.string().trim().url().max(1000).optional(),
  cancelUrl: z.string().trim().url().max(1000).optional(),
});

function getUserId(res: Response) {
  return (res.locals.user as { sub?: string } | undefined)?.sub;
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

paymentRouter.post('/stripe/checkout', validateBody(checkoutSchema), async (req, res) => {
  const userId = getUserId(res);
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const successUrl = req.body.successUrl || `${config.publicBaseUrl}/payment/success`;
  const cancelUrl = req.body.cancelUrl || `${config.publicBaseUrl}/payment/cancel`;
  const payment = await prisma.paymentRecord.create({
    data: {
      userId,
      provider: 'stripe',
      amount: req.body.amount,
      currency: req.body.currency.toLowerCase(),
      status: config.stripe.secretKey ? 'created' : 'not_configured',
      metadataJson: JSON.stringify({ successUrl, cancelUrl }),
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
      status: 'checkout_created',
    },
  });

  return res.json({
    paymentId: payment.id,
    provider: 'stripe',
    checkoutUrl: session.url,
    sessionId: session.id,
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

export async function stripeWebhookHandler(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.header('stripe-signature') || '';
  if (!verifyStripeSignature(rawBody, signature)) return res.status(400).json({ message: 'Invalid Stripe signature' });

  let event: { type?: string; data?: { object?: { id?: string; client_reference_id?: string; payment_intent?: string } } };
  try {
    event = JSON.parse(rawBody.toString('utf8')) as typeof event;
  } catch {
    return res.status(400).json({ message: 'Invalid Stripe webhook payload' });
  }
  const session = event.data?.object;
  const paymentId = session?.client_reference_id;

  if (event.type === 'checkout.session.completed' && paymentId) {
    await prisma.paymentRecord.updateMany({
      where: { id: paymentId },
      data: {
        status: 'paid',
        providerSessionId: session?.id ?? undefined,
        providerPaymentId: typeof session?.payment_intent === 'string' ? session.payment_intent : undefined,
      },
    });
  }

  return res.json({ received: true });
}
