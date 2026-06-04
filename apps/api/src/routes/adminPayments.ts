import { Router } from 'express';
import type { PaymentRecord } from '@prisma/client';
import { prisma } from '../prisma.js';
import { requireAdmin } from '../middleware/auth.js';

export const adminPaymentsRouter = Router();

adminPaymentsRouter.use(requireAdmin);

function paymentWhere(query: Record<string, unknown>) {
  const status = typeof query.status === 'string' ? query.status.trim() : '';
  const provider = typeof query.provider === 'string' ? query.provider.trim() : '';
  const email = typeof query.email === 'string' ? query.email.trim() : '';

  return {
    ...(status ? { status } : {}),
    ...(provider ? { provider } : {}),
    ...(email ? { user: { email: { contains: email } } } : {}),
  };
}

function serializePayment(payment: PaymentRecord & { user?: { email: string } | null }) {
  return {
    id: payment.id,
    userId: payment.userId,
    userEmail: payment.user?.email ?? '',
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt?.toISOString(),
    failedAt: payment.failedAt?.toISOString(),
    canceledAt: payment.canceledAt?.toISOString(),
    providerSessionId: payment.providerSessionId,
    providerPaymentId: payment.providerPaymentId,
    providerPaymentStatus: payment.providerPaymentStatus,
    providerCustomerEmail: payment.providerCustomerEmail,
    providerCustomerId: payment.providerCustomerId,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    checkoutUrl: payment.checkoutUrl,
    rawWebhookEventId: payment.rawWebhookEventId,
    rawWebhookType: payment.rawWebhookType,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

adminPaymentsRouter.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 100) || 100, 1), 200);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
  const where = paymentWhere(req.query);
  const [items, total] = await Promise.all([
    prisma.paymentRecord.findMany({
      where,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.paymentRecord.count({ where }),
  ]);

  res.json({ items: items.map(serializePayment), total, limit, offset });
});

adminPaymentsRouter.get('/:id', async (req, res) => {
  const payment = await prisma.paymentRecord.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { email: true } } },
  });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  return res.json(serializePayment(payment));
});

adminPaymentsRouter.get('/:id/events', async (req, res) => {
  const events = await prisma.paymentEvent.findMany({
    where: { paymentRecordId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    items: events.map((event) => ({
      id: event.id,
      provider: event.provider,
      eventType: event.eventType,
      eventId: event.eventId,
      status: event.status,
      payloadJson: event.payloadJson,
      createdAt: event.createdAt.toISOString(),
    })),
  });
});
