import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Share2, 
  Eye, 
  Calendar, 
  Check, 
  Copy, 
  ChevronRight
} from 'lucide-react';
import {
  getPublishedArticle,
  listPublishedArticles,
  recordArticleShare,
  recordArticleView,
} from '@/lib/articlesApi';
import { ApiError } from '@/lib/api';
import type { Article, ArticleSummary } from '../../../shared/article';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleSummary[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'not-found' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoadState('loading');
    setArticle(null);

    void Promise.all([getPublishedArticle(id), listPublishedArticles()])
      .then(([found, all]) => {
        if (!active) return;
        setArticle(found);
        setRelatedArticles(all.filter((item) => item.id !== id).slice(0, 3));
        setLoadState('success');

        void recordArticleView(id)
          .then((counts) => {
            if (active) setArticle((current) => current ? { ...current, ...counts } : null);
          })
          .catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadState(error instanceof ApiError && error.status === 404 ? 'not-found' : 'error');
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const handleShare = async () => {
    if (!article) return;

    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setShareToast(true);
        void recordArticleShare(article.id)
          .then((counts) => setArticle((current) => current ? { ...current, ...counts } : null))
          .catch(() => undefined);
        setTimeout(() => {
          setCopied(false);
          setShareToast(false);
        }, 3000);
      } catch {
        prompt('请手动复制文章链接：', shareUrl);
      }
    } else {
      prompt('复制专属文章分享链接：', shareUrl);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center text-[#777777] text-[14px]">
        文章加载中...
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-[28px] font-bold text-[#111111] mb-3">文章加载失败</h2>
        <p className="text-[#666666] mb-6">服务暂时不可用，请稍后重试。</p>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="px-6 py-2.5 bg-emerald-600 text-white text-[14px] font-medium hover:bg-emerald-700 transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-[28px] font-bold text-[#111111] mb-3">未找到该文章</h2>
        <p className="text-[#666666] mb-6">该文章可能已被删除，或尚未对外部公开发布。</p>
        <Link
          to="/"
          className="px-6 py-2.5 bg-emerald-600 text-white text-[14px] font-medium hover:bg-emerald-700 transition-colors"
        >
          返回官网首页
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#111111] font-sans selection:bg-neutral-200">
      {/* 分享成功提示 */}
      {shareToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 text-[14px] flex items-center gap-2 shadow-2xl border border-emerald-500 animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4" />
          <span>文章链接已复制到剪贴板，可直接转发分享给朋友！</span>
        </div>
      )}

      {/* 顶部极简导航栏 */}
      <header className="sticky top-0 z-40 bg-[#ffffff]/90 backdrop-blur-md border-b border-[#eeeeee]">
        <div className="max-w-[1240px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[#666666] hover:text-[#111111] flex items-center gap-1.5 text-[14px] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回首页</span>
            </Link>
            <span className="text-[#cccccc]">/</span>
            <Link to="/" className="text-[18px] font-bold tracking-tight text-[#111111]">
              康途新语
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[13px] font-medium transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? '链接已复制' : '分享此文章'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 文章正文区域 */}
      <main className="max-w-[820px] mx-auto px-6 pt-12 pb-24">
        {/* 文章元信息 */}
        <div className="mb-8 border-b border-[#eeeeee] pb-8">
          <div className="flex items-center gap-2.5 text-[13px] text-[#666666] mb-4">
            <span className="bg-neutral-100 px-2.5 py-0.5 text-neutral-800 font-medium">
              {article.category || '深度文章'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              {article.publishDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              {article.views.toLocaleString()} 次阅读
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Share2 className="w-3.5 h-3.5 text-neutral-400" />
              {article.shares || 0} 次分享
            </span>
          </div>

          <h1 className="text-[32px] sm:text-[42px] font-bold leading-[1.25] text-[#111111] tracking-tight mb-6">
            {article.title}
          </h1>

          {article.summary && (
            <p className="text-[18px] sm:text-[20px] text-[#555555] leading-relaxed font-serif italic border-l-2 border-emerald-600 pl-4 my-6">
              {article.summary}
            </p>
          )}

          <div className="flex items-center justify-between text-[14px] text-[#666666] pt-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[12px] font-bold">
                {(article.author || 'A')[0].toUpperCase()}
              </div>
              <span className="font-medium text-[#222222]">{article.author || '康途新语 专栏'}</span>
            </div>

            <div className="text-[12px] text-[#888888]">
              预计阅读时长约 4 分钟
            </div>
          </div>
        </div>

        {/* 封面图 */}
        {article.coverImage && (
          <div className="w-full mb-10 overflow-hidden border border-[#eeeeee]">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full max-h-[460px] object-cover"
            />
          </div>
        )}

        {/* 正文渲染 (支持 Markdown 标题和换行) */}
        <article className="prose prose-neutral max-w-none text-[16px] sm:text-[17px] leading-[1.8] text-[#222222] space-y-6">
          {article.content.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-[24px] sm:text-[28px] font-bold text-[#111111] mt-10 mb-4 pt-4 border-t border-neutral-100">
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-[20px] sm:text-[22px] font-bold text-[#111111] mt-6 mb-3">
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            if (paragraph.startsWith('> ')) {
              return (
                <blockquote key={idx} className="p-4 bg-emerald-50 border-l-4 border-emerald-600 text-[16px] italic text-[#444444] my-4">
                  {paragraph.replace('> ', '')}
                </blockquote>
              );
            }
            if (paragraph.startsWith('- ')) {
              const items = paragraph.split('\n').filter(Boolean);
              return (
                <ul key={idx} className="list-disc pl-6 space-y-2 text-[#333333]">
                  {items.map((it, i) => (
                    <li key={i}>{it.replace(/^-\s*/, '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="text-[#333333]">
                {paragraph}
              </p>
            );
          })}
        </article>

        {/* 转发与分享专区 (严格按照参考图底部的“一键分享，连接更多可能”模块构建) */}
        <div className="mt-16 p-8 bg-[#f5f5f5] border border-[#e5e5e5] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-[460px]">
            <div className="text-[12px] uppercase font-mono text-[#777777] mb-1">/ 链接分享</div>
            <h3 className="text-[22px] font-bold text-[#111111] mb-2">一键分享，连接更多可能</h3>
            <p className="text-[14px] text-[#666666] leading-relaxed">
              生成专属文章链接，轻松分享到社交媒体或发送给朋友，让优质内容触达更多读者。
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={window.location.href}
              className="px-3 py-2.5 text-[13px] bg-white border border-[#cccccc] font-mono text-[#555555] w-full sm:w-[260px] truncate"
            />
            <button
              onClick={() => void handleShare()}
              className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-[13px] flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已复制' : '复制链接'}</span>
            </button>
          </div>
        </div>

        {/* 底部推荐阅读 */}
        {relatedArticles.length > 0 && (
          <div className="mt-20 pt-10 border-t border-[#e5e5e5]">
            <h3 className="text-[20px] font-bold text-[#111111] mb-6">推荐更多精选文章</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/article/${rel.id}`}
                  className="group block bg-white border border-[#eeeeee] p-4 hover:border-emerald-600 transition-colors"
                >
                  <div className="text-[11px] text-[#888888] font-mono mb-1">{rel.publishDate}</div>
                  <h4 className="text-[15px] font-bold text-[#111111] group-hover:text-emerald-700 line-clamp-2 leading-snug">
                    {rel.title}
                  </h4>
                  <div className="mt-3 text-[12px] text-emerald-600 flex items-center gap-1 font-medium">
                    <span>阅读文章</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
