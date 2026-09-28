import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import AdminRoute from '@/components/AdminRoute';
import HomePage from '@/pages/Home/index';

const AdminPage = lazy(() => import('@/pages/Admin/index'));
const AdminLoginPage = lazy(() => import('@/pages/AdminLogin/index'));
const ArticleDetailPage = lazy(() => import('@/pages/ArticleDetail/index'));
const NotFoundPage = lazy(() => import('@/pages/NotFound/index'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-[#f6faf8] flex items-center justify-center text-[#7c8c83] font-mono text-sm">
    载入中...
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/article/:id',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ArticleDetailPage />
          </Suspense>
        ),
      },
      {
        path: '/admin/login',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AdminLoginPage />
          </Suspense>
        ),
      },
      {
        path: '/admin',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          </Suspense>
        ),
      },
      {
        path: '/admin/articles',
        element: <Navigate to="/admin" replace />,
      },
      {
        path: '/articles',
        element: <Navigate to="/#articles" replace />,
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
