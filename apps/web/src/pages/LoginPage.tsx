import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GradientButton from '../components/common/GradientButton';
import PageContainer from '../components/common/PageContainer';
import { isAuthApiConfigured } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = '登录 - 橙影短剧';
  }, []);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [navigate, user]);

  const from = (location.state as { from?: string } | null)?.from || '/';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer className="py-10 md:py-16">
      <div className="mx-auto max-w-md rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-6 shadow-card backdrop-blur md:p-8">
        <p className="text-sm font-semibold text-accent">橙影会员</p>
        <h1 className="mt-3 text-3xl font-black">邮箱登录</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          登录后可以保留收藏、支付记录和后续观看权益。{isAuthApiConfigured() ? '当前使用后端 API。' : '当前为纯前端本地演示模式。'}
        </p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-white/70">
            邮箱
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-2 h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 text-white outline-none transition focus:border-accent"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm text-white/70">
            密码
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="mt-2 h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 text-white outline-none transition focus:border-accent"
              placeholder="至少 8 位"
            />
          </label>
          {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          <GradientButton type="submit" className="w-full justify-center" disabled={submitting}>
            {submitting ? '登录中...' : '登录'}
          </GradientButton>
        </form>
        <p className="mt-5 text-center text-sm text-white/55">
          还没有账号？
          <Link className="ml-1 text-accent hover:text-white" to="/register">
            去注册
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
