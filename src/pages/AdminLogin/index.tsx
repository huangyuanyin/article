import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSupabaseAuthClient } from '@/lib/supabase';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    try {
      void getSupabaseAuthClient().auth.getSession().then(({ data }) => {
        if (data.session) navigate('/admin', { replace: true });
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Supabase 登录配置无效');
    }
  }, [navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      const { error } = await getSupabaseAuthClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      const from = (location.state as { from?: string } | null)?.from ?? '/admin';
      navigate(from, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6faf8] text-[#132019] flex items-center justify-center px-6">
      <main className="w-full max-w-[420px] border border-[#132019]/15 bg-white p-8">
        <Link to="/" className="inline-flex items-center gap-2 text-[13px] text-[#5b6b62] hover:text-emerald-700">
          <ArrowLeft className="w-4 h-4" />
          返回官网
        </Link>
        <div className="mt-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0f1f16] text-white flex items-center justify-center">
            <LockKeyhole className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold">管理员登录</h1>
            <p className="text-[13px] text-[#7c8c83]">使用已加入白名单的 Supabase 账号</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-[13px] font-semibold mb-1.5">邮箱</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-[#cfd8d2] px-3 py-2.5 text-[14px] focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-[13px] font-semibold mb-1.5">密码</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-[#cfd8d2] px-3 py-2.5 text-[14px] focus:outline-none focus:border-emerald-600"
            />
          </div>

          {errorMessage && (
            <div role="alert" className="border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '正在登录...' : '登录后台'}
          </button>
        </form>
      </main>
    </div>
  );
}
