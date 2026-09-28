import request from 'supertest';
import type { Express } from 'express';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import type { Article, ArticleSummary, DashboardStats } from '../shared/article';
import { createApp } from './app';

const publishedArticle: Article = {
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

const draftArticle: Article = {
  ...publishedArticle,
  id: 'art-002',
  title: '草稿文章',
  status: 'draft',
};

function toSummary(article: Article): ArticleSummary {
  const { content: _content, ...summary } = article;
  void _content;
  return summary;
}

function createRepository() {
  const articles = [publishedArticle, draftArticle].map((article) => ({ ...article }));

  return {
    async healthcheck(): Promise<void> {},
    async listPublished(): Promise<ArticleSummary[]> {
      return articles.filter((article) => article.status === 'published').map(toSummary);
    },
    async findPublishedById(id: string): Promise<Article | null> {
      return articles.find((article) => article.id === id && article.status === 'published') ?? null;
    },
    async listAll(): Promise<Article[]> {
      return articles;
    },
    async create(): Promise<Article> {
      throw new Error('not used');
    },
    async update(): Promise<Article | null> {
      throw new Error('not used');
    },
    async delete(): Promise<boolean> {
      throw new Error('not used');
    },
    async incrementViews(id: string): Promise<Pick<Article, 'views' | 'shares'> | null> {
      const article = articles.find((item) => item.id === id && item.status === 'published');
      if (!article) return null;
      article.views += 1;
      return { views: article.views, shares: article.shares };
    },
    async incrementShares(id: string): Promise<Pick<Article, 'views' | 'shares'> | null> {
      const article = articles.find((item) => item.id === id && item.status === 'published');
      if (!article) return null;
      article.shares += 1;
      return { views: article.views, shares: article.shares };
    },
    async getDashboard(): Promise<DashboardStats> {
      throw new Error('not used');
    },
  };
}

const authenticateAdmin = async () => {};

async function requestApp(app: Express) {
  const server = app.listen(0);
  await once(server, 'listening');
  return { client: request(server), server };
}

describe('public article API', () => {
  it('reports service health', async () => {
    const { client, server } = await requestApp(createApp({ articleRepository: createRepository(), authenticateAdmin }));
    const response = await client.get('/api/health');
    server.close();
    await once(server, 'close');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });

  it('returns summaries for published articles only', async () => {
    const { client, server } = await requestApp(createApp({ articleRepository: createRepository(), authenticateAdmin }));
    const response = await client.get('/api/articles');
    server.close();
    await once(server, 'close');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ id: 'art-001', status: 'published' });
    expect(response.body.data[0]).not.toHaveProperty('content');
  });

  it('returns a published article body by id', async () => {
    const { client, server } = await requestApp(createApp({ articleRepository: createRepository(), authenticateAdmin }));
    const response = await client.get('/api/articles/art-001');
    server.close();
    await once(server, 'close');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: 'art-001', content: '正文' });
  });

  it('returns 404 for a draft through the public route', async () => {
    const { client, server } = await requestApp(createApp({ articleRepository: createRepository(), authenticateAdmin }));
    const response = await client.get('/api/articles/art-002');
    server.close();
    await once(server, 'close');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
  });

  it('increments views and shares through repository methods', async () => {
    const { client, server } = await requestApp(createApp({ articleRepository: createRepository(), authenticateAdmin }));

    const viewResponse = await client.post('/api/articles/art-001/view');
    const shareResponse = await client.post('/api/articles/art-001/share');
    server.close();
    await once(server, 'close');

    expect(viewResponse.status).toBe(200);
    expect(viewResponse.body.data).toEqual({ views: 11, shares: 2 });
    expect(shareResponse.status).toBe(200);
    expect(shareResponse.body.data).toEqual({ views: 11, shares: 3 });
  });

  it('returns 400 for an article id outside the allowed format', async () => {
    const { client, server } = await requestApp(createApp({ articleRepository: createRepository(), authenticateAdmin }));
    const response = await client.get('/api/articles/invalid%20id');
    server.close();
    await once(server, 'close');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
