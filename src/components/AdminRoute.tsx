import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, useLocation } from 'react-router-dom';
import { getSupabaseAuthClient } from '@/lib/supabase';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    try {
      const client = getSupabaseAuthClient();
      void client.auth.getSession().then(({ data, error }) => {
        if (error) {
          setErrorMessage('无法读取登录状态，请刷新后重试');
          setStatus('error');
          return;
        }
        setSession(data.session);
        setStatus('ready');
      });

      const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setStatus('ready');
      });
      return () => data.subscription.unsubscribe();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Supabase 登录配置无效');
      setStatus('error');
    }
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-[14px] text-[#777777]">
        正在验证管理员身份...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-[22px] font-bold text-[#111111]">后台登录不可用</h1>
          <p className="mt-3 text-[14px] text-[#666666]">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
