import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import { useAuth } from '../contexts/AuthContext';
import { track } from '../lib/analytics';
import { createStripeCheckout, getMyPayments, type UserPayment } from '../lib/payments';

function formatMoney(payment: UserPayment) {
  return `${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`;
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = '我的账号 - 橙影短剧';
  }, []);

  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    if (paymentResult === 'success') {
      track('payment_success_page_view', { provider: 'stripe' });
      setMessage('已从 Stripe 支付页返回。最终支付状态以后端 webhook 更新的支付记录为准，下面会尝试读取最新记录。');
      void getMyPayments().then(setPayments);
    }
    if (paymentResult === 'cancel') {
      track('payment_cancel_page_view', { provider: 'stripe' });
      setMessage('你已取消支付。未完成的 checkout 会在 Stripe 过期 webhook 到达后更新为 canceled。');
      void getMyPayments().then(setPayments);
    }
  }, [searchParams]);

  async function handleCheckout() {
    const amount = 990;
    const currency = 'cny';
    setMessage('');
    setSubmitting(true);
    track('payment_checkout_start', { provider: 'stripe', amount, currency });
    try {
      const result = await createStripeCheckout(amount, currency);
      if (result.checkoutUrl) {
        track('payment_checkout_redirect', { paymentId: result.paymentId, provider: result.provider || 'stripe' });
        window.location.href = result.checkoutUrl;
      } else {
        setMessage(result.message || 'Stripe checkout 已创建，但暂未返回跳转地址。');
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
          <p className="mt-3 text-white/55">登录后可以查看会员与支付入口。</p>
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
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-6 shadow-card md:p-8">
          <p className="text-sm font-semibold text-accent">我的账号</p>
          <h1 className="mt-3 text-3xl font-black">{user.email}</h1>
          <p className="mt-4 text-sm leading-6 text-white/58">
            当前版本提供 Stripe Checkout 支付链路。支付是否成功以后端 webhook 更新的 PaymentRecord 为准，不以浏览器跳转为准。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <GradientButton type="button" onClick={handleCheckout} disabled={submitting}>
              {submitting ? '创建支付中...' : '开通会员 ¥9.90'}
            </GradientButton>
            <GradientButton type="button" variant="secondary" onClick={logout}>
              退出登录
            </GradientButton>
          </div>
          {message && <p className="mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/68">{message}</p>}
          {payments.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <h2 className="text-sm font-semibold text-white/80">最近支付记录</h2>
              <div className="mt-3 space-y-2">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/55">
                    <span>
                      {payment.provider} · {formatMoney(payment)}
                    </span>
                    <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs">{payment.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <aside className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-6 md:p-8">
          <h2 className="text-xl font-bold">服务接入状态</h2>
          <ul className="mt-5 space-y-3 text-sm text-white/58">
            <li>Stripe：配置 STRIPE_SECRET_KEY 后启用 checkout。</li>
            <li>Webhook：支付成功、失败、过期由后端 PaymentEvent 记录。</li>
            <li>阿里云 OSS：后端预留 STS / 签名上传路径。</li>
          </ul>
          <Link className="mt-6 inline-flex text-sm font-semibold text-accent hover:text-white" to="/">
            返回首页
          </Link>
        </aside>
      </div>
    </PageContainer>
  );
}
