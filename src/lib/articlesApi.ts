import type { Article, ArticleInput, ArticleSummary, DashboardStats } from '../../shared/article';
import { apiRequest } from './api';

export const listPublishedArticles = () =>
  apiRequest<ArticleSummary[]>('/api/articles');

export const getPublishedArticle = (id: string) =>
  apiRequest<Article>(`/api/articles/${encodeURIComponent(id)}`);

export const recordArticleView = (id: string) =>
  apiRequest<Pick<Article, 'views' | 'shares'>>(
    `/api/articles/${encodeURIComponent(id)}/view`,
    { method: 'POST' },
  );

export const recordArticleShare = (id: string) =>
  apiRequest<Pick<Article, 'views' | 'shares'>>(
    `/api/articles/${encodeURIComponent(id)}/share`,
    { method: 'POST' },
  );

export const listAdminArticles = (accessToken: string) =>
  apiRequest<Article[]>('/api/admin/articles', {}, accessToken);

export const createArticle = (input: ArticleInput, accessToken: string) =>
  apiRequest<Article>(
    '/api/admin/articles',
    { method: 'POST', body: JSON.stringify(input) },
    accessToken,
  );

export const updateArticle = (
  id: string,
  input: Partial<ArticleInput>,
  accessToken: string,
) =>
  apiRequest<Article>(
    `/api/admin/articles/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    accessToken,
  );

export const deleteArticle = (id: string, accessToken: string) =>
  apiRequest<void>(
    `/api/admin/articles/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    accessToken,
  );

export const getDashboard = (accessToken: string) =>
  apiRequest<DashboardStats>('/api/admin/dashboard', {}, accessToken);
