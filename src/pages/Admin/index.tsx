import React, { useCallback, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Share2, 
  Eye, 
  ArrowLeft, 
  ExternalLink, 
  TrendingUp, 
  Check, 
  Copy,
  LayoutDashboard,
  Calendar,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import {
  createArticle,
  deleteArticle,
  getDashboard,
  listAdminArticles,
  updateArticle,
} from '@/lib/articlesApi';
import { ApiError } from '@/lib/api';
import { getSupabaseAuthClient } from '@/lib/supabase';
import type { Article, ArticleInput, DashboardStats } from '../../../shared/article';

interface ArticleFormData {
  title: string;
  summary: string;
  content: string;
  coverImage: string;
  publishDate: string;
  views: number;
  shares: number;
  status: 'published' | 'draft';
  category: string;
  author: string;
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toArticleInput(formData: ArticleFormData): ArticleInput {
  return {
    title: formData.title.trim(),
    summary: formData.summary.trim() || `${formData.content.trim().slice(0, 100)}...`,
    content: formData.content,
    coverImage: formData.coverImage.trim() || null,
    publishDate: new Date(formData.publishDate).toISOString(),
    views: Math.max(0, Number(formData.views) || 0),
    shares: Math.max(0, Number(formData.shares) || 0),
    status: formData.status,
    category: formData.category.trim() || null,
    author: formData.author.trim() || null,
  };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'create' | 'edit'>('articles');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 编辑或新建文章表单状态
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    summary: '',
    content: '',
    coverImage: '',
    publishDate: '',
    views: 0,
    shares: 0,
    status: 'published' as 'published' | 'draft',
    category: '设计洞察',
    author: '管理员'
  });

  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  }, []);

  const handleRequestError = useCallback(async (error: unknown) => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      await getSupabaseAuthClient().auth.signOut();
      navigate('/admin/login', { replace: true });
      return;
    }
    const message = error instanceof Error ? error.message : '请求失败，请稍后重试';
    showToast(message, 'error');
  }, [navigate, showToast]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data, error } = await getSupabaseAuthClient().auth.getSession();
    if (error || !data.session?.access_token) {
      await getSupabaseAuthClient().auth.signOut();
      navigate('/admin/login', { replace: true });
      return null;
    }
    setAdminEmail(data.session.user.email ?? '管理员');
    return data.session.access_token;
  }, [navigate]);

  const refreshDashboardAfterMutation = useCallback(async (
    accessToken: string,
    successMessage: string,
  ) => {
    try {
      setDashboard(await getDashboard(accessToken));
      showToast(successMessage);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await handleRequestError(error);
        return;
      }
      showToast(`${successMessage}，但统计数据刷新失败`, 'error');
    }
  }, [handleRequestError, showToast]);

  const loadData = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const [articleList, stats] = await Promise.all([
        listAdminArticles(accessToken),
        getDashboard(accessToken),
      ]);
      setArticles(articleList);
      setDashboard(stats);
      setLoadState('ready');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await handleRequestError(error);
        return;
      }
      setLoadError(error instanceof Error ? error.message : '后台数据加载失败');
      setLoadState('error');
    }
  }, [getAccessToken, handleRequestError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 统计数据
  const totalArticles = dashboard?.totalArticles ?? articles.length;
  const publishedCount = dashboard?.publishedArticles ?? articles.filter(a => a.status === 'published').length;
  const totalViews = dashboard?.totalViews ?? 0;
  const totalShares = dashboard?.totalShares ?? 0;

  const filteredArticles = articles.filter(item => {
    if (filter === 'published' && item.status !== 'published') return false;
    if (filter === 'draft' && item.status !== 'draft') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q));
    }
    return true;
  });

  const handleStartCreate = () => {
    setFormData({
      title: '',
      summary: '',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
      publishDate: toDateTimeLocal(new Date().toISOString()),
      views: 0,
      shares: 0,
      status: 'draft',
      category: '设计洞察',
      author: '编辑部'
    });
    setCurrentEditId(null);
    setActiveTab('create');
  };

  const handleStartEdit = (article: Article) => {
    setCurrentEditId(article.id);
    setFormData({
      title: article.title,
      summary: article.summary,
      content: article.content,
      coverImage: article.coverImage || '',
      publishDate: toDateTimeLocal(article.publishDate),
      views: article.views,
      shares: article.shares || 0,
      status: article.status,
      category: article.category || '设计洞察',
      author: article.author || '管理员'
    });
    setActiveTab('edit');
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('请填写文章标题');
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const input = toArticleInput(formData);
      let successMessage: string;
      if (currentEditId) {
        const saved = await updateArticle(currentEditId, input, accessToken);
        setArticles((current) => current.map((article) => article.id === saved.id ? saved : article));
        successMessage = '文章已成功更新并保存';
      } else {
        const saved = await createArticle(input, accessToken);
        setArticles((current) => [saved, ...current]);
        successMessage = '新文章已保存';
      }
      setActiveTab('articles');
      await refreshDashboardAfterMutation(accessToken, successMessage);
    } catch (error) {
      await handleRequestError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`确定要删除文章《${title}》吗？`)) {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        await deleteArticle(id, accessToken);
        setArticles((current) => current.filter((article) => article.id !== id));
        await refreshDashboardAfterMutation(accessToken, '文章已删除');
      } catch (error) {
        await handleRequestError(error);
      }
    }
  };

  const handleSignOut = async () => {
    await getSupabaseAuthClient().auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/article/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('文章链接已成功复制到剪贴板！');
    }).catch(() => {
      prompt('请手动复制文章链接：', url);
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#111111] flex font-sans">
      {/* 消息提示浮层 */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 text-white px-5 py-3 rounded-none text-[14px] flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-4 ${
          toast.kind === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-red-600 border border-red-500'
        }`}>
          <Check className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* 左侧深色侧边栏 */}
      <aside className="w-[260px] bg-[#0e1a15] text-white flex-shrink-0 flex flex-col justify-between border-r border-[#1c2b23]">
        <div>
          {/* Logo 区域 */}
          <div className="p-6 border-b border-[#1c2b23] flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="text-[20px] font-bold tracking-tight">康途新语</span>
              <span className="text-[11px] bg-emerald-900/50 text-emerald-400 px-2 py-0.5 font-medium">ADMIN</span>
            </Link>
          </div>

          {/* 导航菜单 */}
          <nav className="p-4 space-y-1 text-[14px]">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-left transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-[#888888] hover:text-white hover:bg-[#152219]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>仪表盘概览</span>
            </button>

            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-none text-left transition-colors ${
                activeTab === 'articles'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-[#888888] hover:text-white hover:bg-[#152219]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>文章管理</span>
              </div>
              <span className="text-[12px] text-[#777777] bg-[#152219] px-1.5 py-0.5">{articles.length}</span>
            </button>

            <button
              onClick={handleStartCreate}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-left transition-colors ${
                activeTab === 'create'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-[#888888] hover:text-white hover:bg-[#152219]'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>新建与上传</span>
            </button>
          </nav>
        </div>

        {/* 底部回到官网与退出 */}
        <div className="p-4 border-t border-[#1c2b23] space-y-2">
          <Link
            to="/"
            className="flex items-center justify-between px-4 py-2.5 text-[13px] text-[#aaaaaa] hover:text-white hover:bg-[#152219] transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span>访问前台官网</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </Link>
          <div className="px-4 py-2 text-[12px] text-[#777777] truncate" title={adminEmail}>
            当前管理员：{adminEmail || '已登录'}
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#aaaaaa] hover:text-white hover:bg-[#152219] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 右侧主工作区 */}
      <main className="flex-1 overflow-y-auto min-h-screen p-8 lg:p-10">
        {/* 顶部标题栏 */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#e5e5e5] mb-8">
          <div>
            <div className="text-[13px] text-[#777777] uppercase tracking-wider mb-1 font-mono">
              / 后台管理系统
            </div>
            <h1 className="text-[28px] font-bold text-[#111111]">
              {activeTab === 'dashboard' && '仪表盘数据统计'}
              {activeTab === 'articles' && '文章内容管理'}
              {activeTab === 'create' && '上传与新建文章'}
              {activeTab === 'edit' && '编辑文章信息'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#cccccc] text-[#111111] bg-white hover:bg-neutral-50 text-[14px] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>前台预览</span>
            </Link>
            
            {activeTab !== 'create' && (
              <button
                onClick={handleStartCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[14px] font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>新建文章</span>
              </button>
            )}
          </div>
        </header>

        {loadState === 'loading' && (
          <div className="mb-6 border border-[#dce5df] bg-white px-4 py-3 text-[13px] text-[#666666] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            正在加载后台数据...
          </div>
        )}

        {loadState === 'error' && (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button type="button" onClick={() => void loadData()} className="font-semibold underline whitespace-nowrap">
              重新加载
            </button>
          </div>
        )}

        {/* 视图一：仪表盘概览 */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 border border-[#e5e5e5]">
                <div className="text-[13px] text-[#777777] mb-2 font-medium">文章总数</div>
                <div className="text-[36px] font-bold text-[#111111]">{totalArticles}</div>
                <div className="mt-2 text-[12px] text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>已发布 {publishedCount} 篇 · 草稿 {totalArticles - publishedCount} 篇</span>
                </div>
              </div>

              <div className="bg-white p-6 border border-[#e5e5e5]">
                <div className="text-[13px] text-[#777777] mb-2 font-medium">总浏览量</div>
                <div className="text-[36px] font-bold text-[#111111]">{totalViews.toLocaleString()}</div>
                <div className="mt-2 text-[12px] text-neutral-500 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>真实前台累积加权</span>
                </div>
              </div>

              <div className="bg-white p-6 border border-[#e5e5e5]">
                <div className="text-[13px] text-[#777777] mb-2 font-medium">总分享量</div>
                <div className="text-[36px] font-bold text-[#111111]">{totalShares.toLocaleString()}</div>
                <div className="mt-2 text-[12px] text-neutral-500 flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>社媒与复制链接扩散</span>
                </div>
              </div>

              <div className="bg-white p-6 border border-[#e5e5e5]">
                <div className="text-[13px] text-[#777777] mb-2 font-medium">文章发布率</div>
                <div className="text-[36px] font-bold text-[#111111]">{dashboard?.publishRate ?? 0}%</div>
                <div className="mt-2 text-[12px] text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>已发布文章占全部内容比例</span>
                </div>
              </div>
            </div>

            {/* 快捷跳转与最新动态 */}
            <div className="bg-white border border-[#e5e5e5] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold">最近编辑的文章</h3>
                <button
                  onClick={() => setActiveTab('articles')}
                  className="text-[13px] text-[#111111] hover:underline"
                >
                  查看全部文章 &rarr;
                </button>
              </div>
              <div className="divide-y divide-[#eeeeee]">
                {(dashboard?.recentlyUpdated ?? []).map(item => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[15px]">{item.title}</div>
                      <div className="text-[12px] text-[#888888] mt-0.5">
                        发布时间: {item.publishDate} · 浏览: {item.views}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const fullArticle = articles.find((article) => article.id === item.id);
                          if (fullArticle) handleStartEdit(fullArticle);
                        }}
                        className="text-[13px] text-[#111111] hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleCopyLink(item.id)}
                        className="text-[13px] text-[#666666] hover:text-black"
                      >
                        复制链接
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 视图二：文章管理列表 */}
        {activeTab === 'articles' && (
          <div className="bg-white border border-[#e5e5e5]">
            {/* 过滤与搜索栏 */}
            <div className="p-4 sm:p-6 border-b border-[#eeeeee] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[#666666] hover:text-[#111111] bg-neutral-100'
                  }`}
                >
                  全部文章 ({articles.length})
                </button>
                <button
                  onClick={() => setFilter('published')}
                  className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    filter === 'published'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[#666666] hover:text-[#111111] bg-neutral-100'
                  }`}
                >
                  已发布 ({articles.filter(a => a.status === 'published').length})
                </button>
                <button
                  onClick={() => setFilter('draft')}
                  className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    filter === 'draft'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[#666666] hover:text-[#111111] bg-neutral-100'
                  }`}
                >
                  草稿箱 ({articles.filter(a => a.status === 'draft').length})
                </button>
              </div>

              <div className="relative w-full sm:w-[280px]">
                <input
                  type="text"
                  placeholder="搜索文章标题或分类..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-4 py-1.5 text-[13px] border border-[#d5d5d5] focus:outline-none focus:border-black bg-[#fafafa]"
                />
              </div>
            </div>

            {/* 文章表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-[#fcfcfc] text-[#777777] text-[12px] uppercase font-mono tracking-wider border-b border-[#eeeeee]">
                  <tr>
                    <th className="py-3.5 px-6">文章标题</th>
                    <th className="py-3.5 px-4">分类</th>
                    <th className="py-3.5 px-4">发布日期</th>
                    <th className="py-3.5 px-4 text-right">浏览量</th>
                    <th className="py-3.5 px-4 text-center">状态</th>
                    <th className="py-3.5 px-6 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeeeee]">
                  {filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#888888]">
                        没有找到匹配的文章内容
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((article) => (
                      <tr key={article.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-[#111111] hover:text-neutral-600 cursor-pointer" onClick={() => handleStartEdit(article)}>
                            {article.title}
                          </div>
                          <div className="text-[12px] text-[#888888] line-clamp-1 mt-0.5">
                            {article.summary}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[13px] text-[#555555]">
                          <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 text-[11px]">
                            {article.category || '未分类'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-[13px] text-[#666666] font-mono">
                          {article.publishDate}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-[13px] text-[#333333]">
                          {article.views.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {article.status === 'published' ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                              已发布
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                              草稿
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 text-[13px]">
                            <button
                              onClick={() => handleCopyLink(article.id)}
                              title="复制文章链接并转发"
                              className="p-1.5 text-[#555555] hover:text-black hover:bg-neutral-200 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <Link
                              to={`/article/${article.id}`}
                              target="_blank"
                              title="前台查看"
                              className="p-1.5 text-[#555555] hover:text-black hover:bg-neutral-200 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleStartEdit(article)}
                              title="编辑文章"
                              className="p-1.5 text-[#555555] hover:text-black hover:bg-neutral-200 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => void handleDelete(article.id, article.title)}
                              title="删除文章"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 视图三 & 四：新建/编辑文章表单 */}
        {(activeTab === 'create' || activeTab === 'edit') && (
          <div className="bg-white border border-[#e5e5e5] p-6 lg:p-8 max-w-4xl">
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#eeeeee]">
              <div>
                <h2 className="text-[20px] font-bold text-[#111111]">
                  {activeTab === 'create' ? '发布新文章' : `编辑文章: ${formData.title || '未命名'}`}
                </h2>
                <p className="text-[13px] text-[#777777] mt-1">
                  可在此处上传内容、配置发布日期、自定义前台浏览量展示以及调整状态。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className="text-[13px] text-[#666666] hover:text-black underline"
              >
                返回文章列表
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-6">
              {/* 标题 */}
              <div>
                <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">
                  文章标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="请输入引人入胜的文章标题..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 text-[15px] border border-[#d5d5d5] focus:outline-none focus:border-black font-medium"
                />
              </div>

              {/* 分类与作者 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">
                    文章分类
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 text-[14px] border border-[#d5d5d5] focus:outline-none focus:border-black bg-white"
                  >
                    <option value="设计洞察">设计洞察</option>
                    <option value="团队协同">团队协同</option>
                    <option value="品牌叙事">品牌叙事</option>
                    <option value="趋势报告">趋势报告</option>
                    <option value="技术前沿">技术前沿</option>
                    <option value="行业动态">行业动态</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">
                    作者 / 来源
                  </label>
                  <input
                    type="text"
                    placeholder="如: ArticlePro 编辑部"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-2.5 text-[14px] border border-[#d5d5d5] focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* 设置发布日期与浏览量 (用户明确要求的核心功能) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#fbfbfb] border border-[#eaeaea]">
                <div>
                  <label className="block text-[13px] font-semibold text-[#111111] mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    设置发布日期
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    className="w-full px-3 py-2 text-[13px] border border-[#d5d5d5] focus:outline-none focus:border-black bg-white font-mono"
                  />
                  <span className="text-[11px] text-[#888888] mt-1 block">可预设或修改展示的发布时间</span>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#111111] mb-1.5 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    自定义浏览量
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.views}
                    onChange={(e) => setFormData({ ...formData, views: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-[13px] border border-[#d5d5d5] focus:outline-none focus:border-black bg-white font-mono"
                  />
                  <span className="text-[11px] text-[#888888] mt-1 block">支持后台设置初始或调整展示值</span>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">
                    文章发布状态
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'published' | 'draft' })}
                    className="w-full px-3 py-2 text-[13px] border border-[#d5d5d5] focus:outline-none focus:border-black bg-white"
                  >
                    <option value="published">正式发布（前台可见）</option>
                    <option value="draft">存为草稿（仅后台可见）</option>
                  </select>
                  <span className="text-[11px] text-[#888888] mt-1 block">随时切换发布/草稿状态</span>
                </div>
              </div>

              {/* 封面图片链接 */}
              <div>
                <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">
                  文章封面图片 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    className="flex-1 px-4 py-2 text-[13px] border border-[#d5d5d5] focus:outline-none focus:border-black font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const presets = [
                        'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
                        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
                        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
                        'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80'
                      ];
                      const currentIndex = presets.indexOf(formData.coverImage);
                      const pick = presets[(currentIndex + 1) % presets.length];
                      setFormData({ ...formData, coverImage: pick });
                    }}
                    className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-[12px] text-neutral-800 border border-neutral-300"
                  >
                    换一张配图
                  </button>
                </div>
                {formData.coverImage && (
                  <div className="mt-2 w-full h-[140px] bg-neutral-100 overflow-hidden border border-[#e5e5e5]">
                    <img src={formData.coverImage} alt="封面预览" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* 摘要 */}
              <div>
                <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">
                  文章摘要 / 导语
                </label>
                <textarea
                  rows={2}
                  placeholder="简述文章核心思想，将展示在前台列表与分享卡片中..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-4 py-2.5 text-[14px] border border-[#d5d5d5] focus:outline-none focus:border-black"
                />
              </div>

              {/* 正文内容 (支持 Markdown 与排版) */}
              <div>
                <label className="block text-[13px] font-semibold text-[#111111] mb-1.5 flex items-center justify-between">
                  <span>正文内容 (支持 Markdown 语法与多段落) <span className="text-red-500">*</span></span>
                  <span className="text-[12px] text-neutral-400 font-normal">支持 ## 标题、列表、引用</span>
                </label>
                <textarea
                  required
                  rows={12}
                  placeholder="在此输入或粘贴文章正文内容... 支持 ## 二级标题，- 列表项，> 引用文本等。"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 text-[14px] leading-relaxed border border-[#d5d5d5] focus:outline-none focus:border-black font-mono"
                />
              </div>

              {/* 提交按钮 */}
              <div className="pt-4 border-t border-[#eeeeee] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('articles')}
                  className="px-6 py-2.5 border border-[#cccccc] text-[#111111] hover:bg-neutral-50 text-[14px] transition-colors"
                >
                  取消
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? '正在保存...' : activeTab === 'create' ? '立即创建并保存' : '保存更新'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
