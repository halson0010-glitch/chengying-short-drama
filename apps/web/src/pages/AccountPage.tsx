import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../lib/analytics';
import { createStripeCheckout, getMyPayments, type UserPayment } from '../lib/payments';
import { getEntitlements, type EntitlementsResponse } from '../services/engagementApi';

function formatMoney(payment: UserPayment) {
  return `${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`;
}

const modules = [
  { label: '继续观看', to: '/library', key: 'continue' },
  { label: '我的收藏', to: '/library', key: 'favorites' },
  { label: '观看历史', to: '/library', key: 'history' },
  { label: '充值记录', to: '/account', key: 'payments' },
] as const;

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementsResponse>({ items: [], hasActiveEntitlement: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = '我的账号 - 橙影短剧';
  }, []);

  useEffect(() => {
    if (!user) return;
    void getMyPayments()
      .then((items) => {
        setPayments(items);
        track('payment_history_view', { count: items.length, source: 'account-page' });
      })
      .catch(() => setPayments([]));
    void getEntitlements().then((items) => {
      setEntitlements(items);
      track('entitlement_view', {
        count: items.items.length,
        hasActiveEntitlement: items.hasActiveEntitlement,
        source: 'account-page',
      });
    });
  }, [user]);

  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    if (paymentResult === 'success') {
      track('payment_success_page_view', { provider: 'stripe' });
      setMessage('已从支付页返回，最终状态以后端 webhook 更新为准。');
      void getMyPayments().then(setPayments);
    }
    if (paymentResult === 'cancel') {
      track('payment_cancel_page_view', { provider: 'stripe' });
      setMessage('你已取消支付，未完成订单会在支付平台过期后更新状态。');
      void getMyPayments().then(setPayments);
    }
  }, [searchParams]);

  async function handleCheckout() {
    const amount = 990;
    const currency = 'cny';
    setMessage('');
    setSubmitting(true);
    track('recharge_entry_click', { source: 'account-page', amount, currency });
    track('payment_checkout_start', { provider: 'stripe', amount, currency });
    try {
      const result = await createStripeCheckout(amount, currency);
      if (result.checkoutUrl) {
        track('payment_checkout_redirect', { paymentId: result.paymentId, provider: result.provider || 'stripe' });
        window.location.href = result.checkoutUrl;
      } else {
        setMessage(result.message || '支付订单已创建，但暂未返回跳转地址。');
        void getMyPayments().then(setPayments);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '支付创建失败');
      void getMyPayments().then(setPayments);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <PageContainer className="py-12">
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black">请先登录</h1>
          <p className="mt-3 text-white/55">登录后可以查看权益、支付记录和账号资料。</p>
          <div className="mt-6 flex justify-center gap-3">
            <GradientButton to="/login">去登录</GradientButton>
            <GradientButton to="/register" variant="secondary">
              注册
            </GradientButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10 md:py-16">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-6 shadow-card md:p-8">
          <p className="text-sm font-semibold text-accent">我的账号</p>
          <h1 className="mt-3 break-all text-3xl font-black">{user.email}</h1>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {modules.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => track('account_module_click', { module: item.key, label: item.label, source: 'account-page' })}
                className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-accent/35 hover:bg-white/[0.06]"
              >
                <p className="font-semibold">{item.label}</p>
                <p className="mt-2 text-xs text-white/42">查看</p>
              </Link>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <GradientButton type="button" onClick={handleCheckout} disabled={submitting}>
              {submitting ? '创建支付中...' : '开通权益 ¥9.90'}
            </GradientButton>
            <GradientButton type="button" variant="secondary" onClick={logout}>
              退出登录
            </GradientButton>
          </div>
          {message && <p className="mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/68">{message}</p>}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-6 md:p-8">
            <h2 className="text-xl font-bold">权益状态</h2>
            <p className="mt-4 text-sm text-white/58">
              {entitlements.hasActiveEntitlement ? '当前存在有效权益。' : '当前暂无有效权益。'}
            </p>
            {entitlements.items.slice(0, 3).map((item) => (
              <div key={item.id} className="mt-3 rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/55">
                {item.type} · {item.status} · 至 {new Date(item.endsAt).toLocaleDateString()}
              </div>
            ))}
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-6 md:p-8">
            <h2 className="text-xl font-bold">最近支付记录</h2>
            {payments.length > 0 ? (
              <div className="mt-4 space-y-2">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/55">
                    <span>
                      {payment.provider} · {formatMoney(payment)}
                    </span>
                    <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs">{payment.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/42">暂无支付记录</p>
            )}
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
