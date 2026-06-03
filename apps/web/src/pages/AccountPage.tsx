import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import { useAuth } from '../contexts/AuthContext';
import { createStripeCheckout } from '../lib/payments';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = '我的账号 - 橙影短剧';
  }, []);

  async function handleCheckout() {
    setMessage('');
    setSubmitting(true);
    try {
      const result = await createStripeCheckout();
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setMessage(result.message || 'Stripe checkout 已创建，但暂未返回跳转地址。');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '支付创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <PageContainer className="py-12">
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black">请先登录</h1>
          <p className="mt-3 text-white/55">登录后可以查看会员与支付骨架入口。</p>
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
            这里预留会员、订单和观看权益管理。当前版本先提供 Stripe Checkout API 骨架，配置密钥后即可接真实支付流程。
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
        </section>
        <aside className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-6 md:p-8">
          <h2 className="text-xl font-bold">服务接入状态</h2>
          <ul className="mt-5 space-y-3 text-sm text-white/58">
            <li>Stripe：配置 STRIPE_SECRET_KEY 后启用 checkout。</li>
            <li>阿里云 OSS：API 已预留占位签名接口。</li>
            <li>支付宝：作为独立支付 provider 预留，未和阿里云混用。</li>
          </ul>
          <Link className="mt-6 inline-flex text-sm font-semibold text-accent hover:text-white" to="/">
            返回首页
          </Link>
        </aside>
      </div>
    </PageContainer>
  );
}
