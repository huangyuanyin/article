import type { Express, Request } from 'express';
import { once } from 'node:events';
import request, { type SuperTest, type Test } from 'supertest';
import type {
  Article,
  ArticleInput,
  ArticleSummary,
  DashboardStats,
} from '../../shared/article';
import type { ArticleRepository } from '../article-repository';
import type { AdminAuthenticator } from '../auth';
import { HttpError } from '../http-error';

export const baseArticle: Article = {
  id: 'art-001',
  title: '已发布文章',
  summary: '摘要',
  content: '正文',
  coverImage: null,
  publishDate: '2026-09-28T08:00:00.000Z',
  views: 10,
  shares: 2,
  status: 'published',
  category: '测试',
  author: '编辑部',
  createdAt: '2026-09-28T08:00:00.000Z',
  updatedAt: '2026-09-28T08:00:00.000Z',
};

function toSummary(article: Article): ArticleSummary {
  const { content: _content, ...summary } = article;
  void _content;
  return summary;
}

export class InMemoryArticleRepository implements ArticleRepository {
  private readonly articles: Article[];
  private sequence = 100;

  constructor(initialArticles: Article[] = [baseArticle]) {
    this.articles = initialArticles.map((article) => ({ ...article }));
  }

  async healthcheck(): Promise<void> {}

  async listPublished(): Promise<ArticleSummary[]> {
    return this.articles.filter((article) => article.status === 'published').map(toSummary);
  }

  async findPublishedById(id: string): Promise<Article | null> {
    return this.articles.find((article) => article.id === id && article.status === 'published') ?? null;
  }

  async listAll(): Promise<Article[]> {
    return this.articles.map((article) => ({ ...article }));
  }

  async create(input: ArticleInput): Promise<Article> {
    const timestamp = '2026-09-28T12:00:00.000Z';
    const article: Article = {
      ...input,
      id: `generated-${this.sequence++}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.articles.unshift(article);
    return { ...article };
  }

  async update(id: string, input: Partial<ArticleInput>): Promise<Article | null> {
    const index = this.articles.findIndex((article) => article.id === id);
    if (index < 0) return null;
    const article = this.articles[index];
    if (!article) return null;
    const updated: Article = {
      ...article,
      ...input,
      id: article.id,
      createdAt: article.createdAt,
      updatedAt: '2026-09-28T13:00:00.000Z',
    };
    this.articles[index] = updated;
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    const index = this.articles.findIndex((article) => article.id === id);
    if (index < 0) return false;
    this.articles.splice(index, 1);
    return true;
  }

  async incrementViews(id: string): Promise<Pick<Article, 'views' | 'shares'> | null> {
    const article = this.articles.find((item) => item.id === id && item.status === 'published');
    if (!article) return null;
    article.views += 1;
    return { views: article.views, shares: article.shares };
  }

  async incrementShares(id: string): Promise<Pick<Article, 'views' | 'shares'> | null> {
    const article = this.articles.find((item) => item.id === id && item.status === 'published');
    if (!article) return null;
    article.shares += 1;
    return { views: article.views, shares: article.shares };
  }

  async getDashboard(): Promise<DashboardStats> {
    const articles = [...this.articles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const publishedArticles = articles.filter((article) => article.status === 'published').length;
    return {
      totalArticles: articles.length,
      publishedArticles,
      draftArticles: articles.length - publishedArticles,
      totalViews: articles.reduce((sum, article) => sum + article.views, 0),
      totalShares: articles.reduce((sum, article) => sum + article.shares, 0),
      publishRate: articles.length === 0 ? 0 : Math.round((publishedArticles / articles.length) * 1000) / 10,
      recentlyUpdated: articles.slice(0, 4).map(toSummary),
    };
  }
}

export const fakeAdminAuthenticator: AdminAuthenticator = async (request: Request) => {
  const authorization = request.header('authorization');
  if (!authorization) throw new HttpError(401, 'UNAUTHENTICATED', '请先登录管理员账号');
  if (authorization === 'Bearer non-admin') {
    throw new HttpError(403, 'FORBIDDEN', '当前账号没有后台管理权限');
  }
  if (authorization !== 'Bearer admin-token') {
    throw new HttpError(401, 'UNAUTHENTICATED', '登录已失效，请重新登录');
  }
};

export async function withTestClient<T>(
  app: Express,
  run: (client: SuperTest<Test>) => Promise<T>,
): Promise<T> {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    return await run(request(server));
  } finally {
    server.close();
    await once(server, 'close');
  }
}
