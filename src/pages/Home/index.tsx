import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Share2,
  Calendar,
  Eye,
  Check,
  FileText,
  Layers,
  TrendingUp,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { listPublishedArticles, recordArticleShare } from '@/lib/articlesApi';
import type { ArticleSummary } from '../../../shared/article';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.32, 0.72, 0, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'success' | 'error'>('loading');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);

  const loadArticles = async () => {
    setLoadState('loading');
    try {
      setArticles(await listPublishedArticles());
      setLoadState('success');
    } catch {
      setLoadState('error');
    }
  };

  useEffect(() => {
    void loadArticles();
  }, []);

  const featured = articles[0];
  const rest = articles.slice(1);

  const handleCopyDirect = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/article/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(id);
      setCopyToast(true);
      void recordArticleShare(id)
        .then((counts) => {
          setArticles((current) => current.map((article) => (
            article.id === id ? { ...article, ...counts } : article
          )));
        })
        .catch(() => undefined);
      setTimeout(() => {
        setCopiedLink(null);
        setCopyToast(false);
      }, 2500);
    }).catch(() => {
      prompt('请手动复制文章链接：', url);
    });
  };

  return (
    <div className="min-h-screen bg-[#f6faf8] text-[#132019] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* 复制提示浮层 */}
      {copyToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 text-[14px] flex items-center gap-2 border border-emerald-500 font-medium">
          <Check className="w-4 h-4" />
          <span>文章链接已成功复制，可直接粘贴转发！</span>
        </div>
      )}

      {/* 顶部导航 —— 极简发丝线导航，不居中，Logo 左 / 链接右 */}
      <header className="sticky top-0 z-40 bg-[#f6faf8]/85 backdrop-blur-md">
        <div className="w-full px-6 sm:px-10 h-[84px] flex items-center justify-between border-b border-[#132019]/10">
          <Link to="/" className="flex items-center gap-2.5 font-display text-[21px] font-semibold tracking-tight text-[#0f1f16]">
            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
            康途新语
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-[13px] tracking-wide text-[#4c5b52]">
            <a href="#features" className="hover:text-[#0f1f16] transition-colors">内容特色</a>
            <a href="#articles" className="hover:text-[#0f1f16] transition-colors">最新文章</a>
            <a href="#categories" className="hover:text-[#0f1f16] transition-colors">科普专栏</a>
            <a href="#footer" className="hover:text-[#0f1f16] transition-colors">关于我们</a>
          </nav>

          <a
            href="#articles"
            className="group inline-flex items-center gap-3 pl-5 pr-1.5 py-1.5 bg-[#0f1f16] text-white text-[13px] font-medium rounded-full transition-colors hover:bg-emerald-700"
          >
            开始阅读
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>
        </div>
      </header>

      {/* Hero —— 居中排版 */}
      <section id="hero" className="relative pt-24 pb-24 overflow-hidden">
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="w-full px-6 sm:px-10 flex flex-col items-center text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-emerald-600/25 bg-emerald-600/5 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.2em] text-emerald-700 mb-8">
            <Sparkles className="w-3 h-3" />
            健康科普 · 值得信赖的阅读
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display font-medium text-[#0e1c14] leading-[0.98] tracking-tight text-[13vw] sm:text-[76px] lg:text-[92px]"
          >
            专注科普 <span className="italic text-emerald-700">健康</span>可及
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-8 text-[18px] text-[#4c5b52] leading-relaxed max-w-[560px]">
            康途新语专注健康科普内容创作，把专业、复杂的健康知识转化为通俗易懂的生活指南，陪你科学生活每一天。
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#articles"
              className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 bg-emerald-600 text-white rounded-full text-[14px] font-semibold transition-colors hover:bg-emerald-700"
            >
              开始阅读
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-4 h-4" />
              </span>
            </a>
            <a
              href="#categories"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-[14px] text-[#3a4a41] border-b border-[#3a4a41]/30 hover:border-emerald-600 hover:text-emerald-700 transition-colors"
            >
              浏览专栏
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-14 relative w-full max-w-[820px] aspect-[16/8] overflow-hidden bg-[#0f1f16]">
            <img
              src="https://cdn.wegic.ai/assets/onepage/agent/reference-assets/hero-laptop-workspace-01M2QNB2V22AXCGQARD5QYZZZ1-enhanced.png"
              alt="康途新语 健康科普阅读场景"
              className="w-full h-full object-cover mix-blend-luminosity opacity-90"
            />
            <div className="absolute inset-0 bg-emerald-900/20" />
            <div className="absolute bottom-0 left-0 right-0 p-7 text-white text-left">
              <div className="font-display italic text-[22px] leading-snug">
                “深入浅出，让知识更有温度。”
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 grid grid-cols-3 gap-8 sm:gap-16 border-t border-[#132019]/10 pt-8 max-w-[560px] w-full">
            <div>
              <div className="font-display text-[28px] text-[#0f1f16]">{articles.length}+</div>
              <div className="text-[12px] text-[#7c8c83] mt-1">科普文章</div>
            </div>
            <div>
              <div className="font-display text-[28px] text-[#0f1f16]">
                {(articles.reduce((s, a) => s + a.views, 0) / 1000).toFixed(1)}k
              </div>
              <div className="text-[12px] text-[#7c8c83] mt-1">累计阅读</div>
            </div>
            <div>
              <div className="font-display text-[28px] text-[#0f1f16]">4</div>
              <div className="text-[12px] text-[#7c8c83] mt-1">专栏方向</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* 内容特色 —— 打破三栏卡片模板：左侧标题独立，右侧不规则清单式排列 */}
      <section id="features" className="border-t border-[#132019]/10">
        <div className="w-full px-6 sm:px-10 py-28 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-12">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="lg:col-span-4"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-700 mb-4">为什么选择康途新语</div>
            <h2 className="font-display text-[38px] sm:text-[46px] leading-[1.05] text-[#0f1f16]">
              专业、可靠、<br />易懂的健康内容
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="lg:col-span-8 lg:col-start-5 divide-y divide-[#132019]/10 border-t border-[#132019]/10"
          >
            {[
              { icon: FileText, title: '专业内容把关', desc: '每篇文章均经过严谨审校，力求健康知识准确、严谨、可信赖。' },
              { icon: Layers, title: '分类专栏体系', desc: '涵盖营养饮食、运动健身、心理健康、慢病管理等多个专栏，方便按需查阅。' },
              { icon: Calendar, title: '持续更新', desc: '定期发布新内容，紧跟健康热点与前沿知识，常来常新。' },
              { icon: Eye, title: '深入浅出', desc: '把复杂的健康知识转化为通俗易懂的生活指南，人人都能看懂。' },
              { icon: Share2, title: '一键分享', desc: '觉得有用的文章，随手复制链接分享给关心的家人朋友。' },
              { icon: TrendingUp, title: '趋势与误区解读', desc: '聚焦健康趋势与常见认知误区，帮你理性看待网络健康信息。' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="group flex items-start gap-6 py-7 hover:bg-[#0f1f16]/[0.02] transition-colors px-2"
              >
                <span className="font-display text-[13px] text-[#7c8c83] pt-1.5 w-6 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <item.icon className="w-5 h-5 text-emerald-600 mt-1 shrink-0" strokeWidth={1.5} />
                <div>
                  <h3 className="text-[17px] font-semibold text-[#0f1f16] mb-1.5">{item.title}</h3>
                  <p className="text-[14px] text-[#5b6b62] leading-relaxed max-w-[520px]">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 精选文章 —— 首篇大图 Feature + 其余小列表，打破统一网格 */}
      <section id="articles" className="border-t border-[#132019]/10 bg-white">
        <div className="w-full px-6 sm:px-10 py-28">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4"
          >
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-700 mb-3">精选内容</div>
              <h2 className="font-display text-[38px] sm:text-[46px] text-[#0f1f16] leading-none">
                精选与最新文章
              </h2>
            </div>
            <p className="text-[14px] text-[#5b6b62] max-w-[380px]">
              点击任意文章即可进入完整阅读视图，随时复制专属文章链接分享给朋友。
            </p>
          </motion.div>

          {loadState === 'loading' && (
            <div className="min-h-[220px] border-y border-[#132019]/10 flex items-center justify-center text-[14px] text-[#7c8c83]">
              文章加载中...
            </div>
          )}

          {loadState === 'error' && (
            <div className="min-h-[220px] border-y border-[#132019]/10 flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-[14px] text-[#5b6b62]">文章暂时无法加载，请检查网络后重试。</p>
              <button
                type="button"
                onClick={() => void loadArticles()}
                className="px-5 py-2 bg-[#0f1f16] text-white text-[13px] hover:bg-emerald-700 transition-colors"
              >
                重新加载
              </button>
            </div>
          )}

          {loadState === 'success' && articles.length === 0 && (
            <div className="min-h-[220px] border-y border-[#132019]/10 flex items-center justify-center text-[14px] text-[#7c8c83]">
              暂无已发布文章
            </div>
          )}

          {featured && (
            <motion.article
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 pb-16 border-b border-[#132019]/10"
            >
              <Link to={`/article/${featured.id}`} className="lg:col-span-7 block overflow-hidden relative aspect-[16/9] bg-[#eef6f1]">
                {featured.coverImage && (
                  <img
                    src={featured.coverImage}
                    alt={featured.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                  />
                )}
                <span className="absolute top-4 left-4 bg-[#0f1f16] text-white text-[11px] px-3 py-1.5">
                  {featured.category || '健康科普'}
                </span>
              </Link>
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-[12px] text-[#7c8c83] mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  {featured.publishDate}
                  <span>·</span>
                  <Eye className="w-3.5 h-3.5" />
                  {featured.views.toLocaleString()} 浏览
                </div>
                <Link to={`/article/${featured.id}`}>
                  <h3 className="font-display text-[30px] sm:text-[34px] leading-[1.1] text-[#0f1f16] hover:text-emerald-700 transition-colors mb-4">
                    {featured.title}
                  </h3>
                </Link>
                <p className="text-[15px] text-[#5b6b62] leading-relaxed mb-6 max-w-[460px]">
                  {featured.summary}
                </p>
                <div className="flex items-center gap-6 text-[13px]">
                  <Link to={`/article/${featured.id}`} className="inline-flex items-center gap-1.5 text-[#0f1f16] font-medium hover:text-emerald-700">
                    阅读全文 <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={(e) => handleCopyDirect(featured.id, e)}
                    className="inline-flex items-center gap-1.5 text-[#5b6b62] hover:text-emerald-700 transition-colors"
                  >
                    {copiedLink === featured.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    {copiedLink === featured.id ? '已复制' : '分享'}
                  </button>
                </div>
              </div>
            </motion.article>
          )}

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="divide-y divide-[#132019]/10"
          >
            {rest.map((article) => (
              <motion.article
                key={article.id}
                variants={fadeUp}
                className="group grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-8 items-center py-8"
              >
                {article.coverImage && (
                  <Link to={`/article/${article.id}`} className="sm:col-span-3 block overflow-hidden relative aspect-[4/3] bg-[#eef6f1]">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </Link>
                )}
                <div className="sm:col-span-6">
                  <div className="flex items-center gap-3 text-[11px] text-[#7c8c83] font-mono mb-2">
                    <span>{article.category || '健康科普'}</span>
                    <span>·</span>
                    <span>{article.publishDate}</span>
                  </div>
                  <Link to={`/article/${article.id}`}>
                    <h3 className="text-[19px] font-semibold text-[#0f1f16] group-hover:text-emerald-700 transition-colors leading-snug mb-2">
                      {article.title}
                    </h3>
                  </Link>
                  <p className="text-[13.5px] text-[#5b6b62] line-clamp-2 leading-relaxed max-w-[480px]">
                    {article.summary}
                  </p>
                </div>
                <div className="sm:col-span-3 flex sm:flex-col sm:items-end items-center justify-between sm:justify-end gap-2 sm:gap-3 text-[13px]">
                  <span className="flex items-center gap-1.5 text-[#7c8c83]">
                    <Eye className="w-3.5 h-3.5" />
                    {article.views.toLocaleString()}
                  </span>
                  <button
                    onClick={(e) => handleCopyDirect(article.id, e)}
                    className="flex items-center gap-1.5 text-[#5b6b62] hover:text-emerald-700 transition-colors"
                  >
                    {copiedLink === article.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    {copiedLink === article.id ? '已复制' : '分享'}
                  </button>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 科普专栏分类 —— 实心品牌色板块，打破留白基调，制造视觉张力 */}
      <section id="categories" className="bg-[#0f1f16] text-white">
        <div className="w-full px-6 sm:px-10 py-28">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="mb-16 max-w-[600px]"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 mb-3">分类专栏</div>
            <h2 className="font-display text-[38px] sm:text-[46px] leading-[1.05]">
              按需查阅，找到你关心的话题
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10"
          >
            {[
              { title: '营养饮食', desc: '日常饮食搭配、营养知识与科学饮食观念的深入浅出解读。' },
              { title: '运动健身', desc: '科学运动方式与健身误区解析，助你安全有效地锻炼身体。' },
              { title: '心理健康', desc: '关注情绪与心理状态，分享科学的心理调适方法与生活建议。' },
              { title: '慢病管理', desc: '常见慢性问题的日常管理知识，帮助建立健康的生活习惯。' },
            ].map((cat) => (
              <motion.div key={cat.title} variants={fadeUp} className="bg-[#0f1f16] p-8 hover:bg-[#122a1e] transition-colors">
                <div className="font-display text-[24px] mb-3">{cat.title}</div>
                <p className="text-[13.5px] text-white/60 leading-relaxed">{cat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 用户证言 —— 巨型引用排版 */}
      <section id="testimonials" className="border-t border-[#132019]/10">
        <div className="w-full px-6 sm:px-10 py-28">
          <motion.blockquote
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            className="font-display italic text-[32px] sm:text-[44px] text-[#0f1f16] leading-[1.2] max-w-[900px]"
          >
            “康途新语的文章让我用很短的时间就能看懂复杂的健康知识，语言通俗又专业，现在已经成了我的日常读物。”
          </motion.blockquote>
          <div className="mt-8 text-[14px] text-[#5b6b62]">— 一位长期读者</div>
        </div>
      </section>

      {/* 底部 CTA */}
      <section id="cta" className="border-t border-[#132019]/10">
        <div className="w-full px-6 sm:px-10 py-24 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          <h2 className="font-display text-[38px] sm:text-[50px] leading-[1.05] text-[#0f1f16] max-w-[560px]">
            开启健康知识的每一天
          </h2>
          <a
            href="#articles"
            className="group inline-flex items-center gap-3 pl-7 pr-2 py-2.5 bg-emerald-600 text-white rounded-full text-[15px] font-semibold transition-colors hover:bg-emerald-700 whitespace-nowrap"
          >
            浏览全部文章
            <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="w-4 h-4" />
            </span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="border-t border-[#132019]/10 bg-white text-[#5b6b62] text-[14px]">
        <div className="w-full px-6 sm:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#132019]/10">
          <div>
            <div className="font-display text-[20px] text-[#0f1f16] mb-3">康途新语</div>
            <p className="text-[13px] text-[#5b6b62] leading-relaxed max-w-[240px]">
              专注健康科普内容创作，用专业、易懂的文章陪你科学生活每一天。
            </p>
          </div>

          <div>
            <div className="text-[#0f1f16] text-[13px] font-semibold mb-3">内容</div>
            <ul className="space-y-2 text-[13px]">
              <li><a href="#features" className="hover:text-[#0f1f16] transition-colors">内容特色</a></li>
              <li><a href="#articles" className="hover:text-[#0f1f16] transition-colors">最新文章</a></li>
              <li><a href="#categories" className="hover:text-[#0f1f16] transition-colors">科普专栏</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[#0f1f16] text-[13px] font-semibold mb-3">关于</div>
            <ul className="space-y-2 text-[13px]">
              <li><span>关于康途新语</span></li>
              <li><span>内容审核规范</span></li>
              <li><span>联系我们</span></li>
            </ul>
          </div>

          <div>
            <div className="text-[#0f1f16] text-[13px] font-semibold mb-3">保持联系</div>
            <p className="text-[13px] text-[#5b6b62] mb-3">
              关注康途新语，第一时间获取最新健康科普内容更新。
            </p>
            <a
              href="#articles"
              className="inline-flex items-center gap-1.5 text-[13px] text-emerald-700 font-medium hover:text-emerald-800"
            >
              浏览全部文章 <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="w-full px-6 sm:px-10 pt-8 pb-10 flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#7c8c83]">
          <div>© {new Date().getFullYear()} 康途新语. 保留所有权利。</div>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <span>隐私政策</span>
            <span>服务条款</span>
            <span>简体中文</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
