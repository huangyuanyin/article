import { describe, expect, it } from 'vitest';
import type { ArticleInput } from '../shared/article';
import { createApp } from './app';
import {
  baseArticle,
  fakeAdminAuthenticator,
  InMemoryArticleRepository,
  withTestClient,
} from './test/fakes';

const articleInput: ArticleInput = {
  title: '新文章',
  summary: '新摘要',
  content: '新正文',
  coverImage: 'https://example.com/cover.jpg',
  publishDate: '2026-09-28T12:00:00.000Z',
  views: 0,
  shares: 0,
  status: 'draft',
  category: '测试分类',
  author: '测试作者',
};

function createAdminApp(repository = new InMemoryArticleRepository()) {
  return createApp({ articleRepository: repository, authenticateAdmin: fakeAdminAuthenticator });
}

describe('admin article API', () => {
  it('returns 401 without a bearer token', async () => {
    await withTestClient(createAdminApp(), async (client) => {
      const response = await client.get('/api/admin/articles');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  it('returns 403 for an authenticated non-admin', async () => {
    await withTestClient(createAdminApp(), async (client) => {
      const response = await client.get('/api/admin/articles').set('Authorization', 'Bearer non-admin');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  it('lists drafts for an administrator', async () => {
    const draft = { ...baseArticle, id: 'art-draft', status: 'draft' as const };
    await withTestClient(createAdminApp(new InMemoryArticleRepository([baseArticle, draft])), async (client) => {
      const response = await client.get('/api/admin/articles').set('Authorization', 'Bearer admin-token');
      expect(response.status).toBe(200);
      expect(response.body.data.map((article: { id: string }) => article.id)).toEqual(['art-001', 'art-draft']);
    });
  });

  it('creates an article with server-owned id and timestamps', async () => {
    await withTestClient(createAdminApp(), async (client) => {
      const response = await client
        .post('/api/admin/articles')
        .set('Authorization', 'Bearer admin-token')
        .send(articleInput);
      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        ...articleInput,
        id: 'generated-100',
        createdAt: '2026-09-28T12:00:00.000Z',
        updatedAt: '2026-09-28T12:00:00.000Z',
      });
    });
  });

  it('returns field errors for an invalid article payload', async () => {
    await withTestClient(createAdminApp(), async (client) => {
      const response = await client
        .post('/api/admin/articles')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...articleInput, title: '', coverImage: 'javascript:alert(1)' });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(response.body.error.fieldErrors).toHaveProperty('title');
      expect(response.body.error.fieldErrors).toHaveProperty('coverImage');
    });
  });

  it('updates only supplied editable fields', async () => {
    await withTestClient(createAdminApp(), async (client) => {
      const response = await client
        .patch('/api/admin/articles/art-001')
        .set('Authorization', 'Bearer admin-token')
        .send({ title: '更新后的标题', status: 'draft' });
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: 'art-001',
        title: '更新后的标题',
        status: 'draft',
        content: '正文',
        createdAt: baseArticle.createdAt,
      });
    });
  });

  it('returns 404 when updating or deleting an unknown id', async () => {
    await withTestClient(createAdminApp(), async (client) => {
      const updateResponse = await client
        .patch('/api/admin/articles/missing')
        .set('Authorization', 'Bearer admin-token')
        .send({ title: '不存在' });
      const deleteResponse = await client
        .delete('/api/admin/articles/missing')
        .set('Authorization', 'Bearer admin-token');
      expect(updateResponse.status).toBe(404);
      expect(deleteResponse.status).toBe(404);
    });
  });

  it('deletes an article with a 204 response', async () => {
    await withTestClient(createAdminApp(), async (client) => {
      const response = await client
        .delete('/api/admin/articles/art-001')
        .set('Authorization', 'Bearer admin-token');
      expect(response.status).toBe(204);
      expect(response.text).toBe('');
    });
  });

  it('returns aggregated dashboard statistics and recent articles', async () => {
    const draft = { ...baseArticle, id: 'art-draft', status: 'draft' as const, views: 5, shares: 1 };
    await withTestClient(createAdminApp(new InMemoryArticleRepository([baseArticle, draft])), async (client) => {
      const response = await client
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer admin-token');
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        totalArticles: 2,
        publishedArticles: 1,
        draftArticles: 1,
        totalViews: 15,
        totalShares: 3,
        publishRate: 50,
      });
      expect(response.body.data.recentlyUpdated[0]).not.toHaveProperty('content');
    });
  });
});
