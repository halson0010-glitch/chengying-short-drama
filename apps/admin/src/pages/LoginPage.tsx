import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(import.meta.env.DEV ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const result = await api.login(username, password);
      setToken(result.token);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={submit} className="surface w-full max-w-md p-8">
        <p className="text-sm text-white/45">Admin Console</p>
        <h1 className="mt-2 text-3xl font-black">橙影短剧后台</h1>
        <label htmlFor="admin-username" className="mt-8 block text-sm text-white/55">账号</label>
        <input
          id="admin-username"
          className="field mt-2"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <label htmlFor="admin-password" className="mt-4 block text-sm text-white/55">密码</label>
        <input
          id="admin-password"
          className="field mt-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p className="mt-4 rounded-xl bg-red-500/12 px-4 py-3 text-sm text-red-200">{error}</p>}
        <button className="btn btn-primary mt-6 w-full" type="submit">
          登录
        </button>
        {import.meta.env.DEV && <p className="mt-4 text-xs text-white/38">开发默认账号：admin / admin123</p>}
      </form>
    </div>
  );
}
