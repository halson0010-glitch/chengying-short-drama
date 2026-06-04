import { track } from './analytics';
import { getStoredToken } from './auth';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

export type CheckoutResult = {
  paymentId?: string;
  provider?: string;
  checkoutUrl?: string | null;
  sessionId?: string;
  status?: string;
  message?: string;
};

export type UserPayment = {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function createStripeCheckout(amount = 990, currency = 'cny'): Promise<CheckoutResult> {
  if (!apiBaseUrl) {
    track('payment_failed', { provider: 'stripe', amount, currency, reason: 'missing_api_base_url' });
    throw new Error('当前未配置 VITE_API_BASE_URL，无法连接 Stripe 支付 API。');
  }

  const token = getStoredToken();
  if (!token) {
    track('payment_failed', { provider: 'stripe', amount, currency, reason: 'not_logged_in' });
    throw new Error('请先登录后再开通会员。');
  }

  const response = await fetch(`${apiBaseUrl}/api/payments/stripe/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      successUrl: `${window.location.origin}${import.meta.env.BASE_URL}account?payment=success`,
      cancelUrl: `${window.location.origin}${import.meta.env.BASE_URL}account?payment=cancel`,
    }),
  });

  const data = (await response.json()) as CheckoutResult;
  if (response.status === 501) {
    track('payment_not_configured', { provider: 'stripe', amount, currency, status: data.status || 'not_configured' });
    return data;
  }
  if (!response.ok) {
    track('payment_failed', { provider: 'stripe', amount, currency, reason: data.message || `status ${response.status}` });
    throw new Error(data.message || `Stripe checkout failed with status ${response.status}`);
  }

  track('payment_checkout_created', {
    paymentId: data.paymentId,
    provider: data.provider || 'stripe',
    amount,
    currency,
    status: data.status,
  });
  return data;
}

export async function getMyPayments() {
  if (!apiBaseUrl) return [];
  const token = getStoredToken();
  if (!token) return [];
  const response = await fetch(`${apiBaseUrl}/api/payments/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { payments?: UserPayment[] };
  return data.payments ?? [];
}
