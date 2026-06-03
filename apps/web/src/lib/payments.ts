import { getStoredToken } from './auth';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

export async function createStripeCheckout(amount = 990, currency = 'cny') {
  if (!apiBaseUrl) {
    throw new Error('当前未配置 VITE_API_BASE_URL，无法连接 Stripe 支付 API。');
  }
  const token = getStoredToken();
  if (!token) throw new Error('请先登录后再开通会员。');

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
  const data = (await response.json()) as { checkoutUrl?: string | null; message?: string };
  if (!response.ok) throw new Error(data.message || `Stripe checkout failed with status ${response.status}`);
  return data;
}
