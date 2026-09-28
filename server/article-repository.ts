import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Article,
  ArticleInput,
  ArticleSummary,
  DashboardStats,
} from '../shared/article.js';

interface ArticleRow {
  id: string;
  title: string;
  summary: string;
  content: string;
  cover_image: string | null;
  publish_date: string;
  views: number | string;
  shares: number | string;
  status: 'published' | 'draft';
  category: string | null;
  author: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleRepository {
  healthcheck(): Promise<void>;
  listPublished(): Promise<ArticleSummary[]>;
  findPublishedById(id: string): Promise<Article | null>;
  listAll(): Promise<Article[]>;
  create(input: ArticleInput): Promise<Article>;
  update(id: string, input: Partial<ArticleInput>): Promise<Article | null>;
  delete(id: string): Promise<boolean>;
  incrementViews(id: string): Promise<Pick<Article, 'views' | 'shares'> | null>;
  incrementShares(id: string): Promise<Pick<Article, 'views' | 'shares'> | null>;
  getDashboard(): Promise<DashboardStats>;
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    coverImage: row.cover_image,
    publishDate: row.publish_date,
    views: Number(row.views),
    shares: Number(row.shares),
    status: row.status,
    category: row.category,
    author: row.author,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummary(row: ArticleRow): ArticleSummary {
  const article = toArticle(row);
  const { content: _content, ...summary } = article;
  void _content;
  return summary;
}

function toRowInput(input: ArticleInput | Partial<ArticleInput>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if ('title' in input) result.title = input.title;
  if ('summary' in input) result.summary = input.summary;
  if ('content' in input) result.content = input.content;
  if ('coverImage' in input) result.cover_image = input.coverImage;
  if ('publishDate' in input) result.publish_date = input.publishDate;
  if ('views' in input) result.views = input.views;
  if ('shares' in input) result.shares = input.shares;
  if ('status' in input) result.status = input.status;
  if ('category' in input) result.category = input.category;
  if ('author' in input) result.author = input.author;
  return result;
}

export class SupabaseArticleRepository implements ArticleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async healthcheck(): Promise<void> {
    const { error } = await this.client.from('articles').select('id').limit(1);
    if (error) throw error;
  }

  async listPublished(): Promise<ArticleSummary[]> {
    const { data, error } = await this.client
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('publish_date', { ascending: false });
    if (error) throw error;
    return (data as ArticleRow[]).map(toSummary);
  }

  async findPublishedById(id: string): Promise<Article | null> {
    const { data, error } = await this.client
      .from('articles')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    return data ? toArticle(data as ArticleRow) : null;
  }

  async listAll(): Promise<Article[]> {
    const { data, error } = await this.client
      .from('articles')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as ArticleRow[]).map(toArticle);
  }

  async create(input: ArticleInput): Promise<Article> {
    const { data, error } = await this.client
      .from('articles')
      .insert(toRowInput(input))
      .select('*')
      .single();
    if (error) throw error;
    return toArticle(data as ArticleRow);
  }

  async update(id: string, input: Partial<ArticleInput>): Promise<Article | null> {
    const { data, error } = await this.client
      .from('articles')
      .update(toRowInput(input))
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? toArticle(data as ArticleRow) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('articles')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return Boolean(data?.length);
  }

  async incrementViews(id: string): Promise<Pick<Article, 'views' | 'shares'> | null> {
    const { data, error } = await this.client.rpc('increment_article_views', { p_article_id: id });
    if (error) throw error;
    const row = (data as Array<{ views: number | string; shares: number | string }> | null)?.[0];
    return row ? { views: Number(row.views), shares: Number(row.shares) } : null;
  }

  async incrementShares(id: string): Promise<Pick<Article, 'views' | 'shares'> | null> {
    const { data, error } = await this.client.rpc('increment_article_shares', { p_article_id: id });
    if (error) throw error;
    const row = (data as Array<{ views: number | string; shares: number | string }> | null)?.[0];
    return row ? { views: Number(row.views), shares: Number(row.shares) } : null;
  }

  async getDashboard(): Promise<DashboardStats> {
    const articles = await this.listAll();
    const publishedArticles = articles.filter((article) => article.status === 'published').length;
    return {
      totalArticles: articles.length,
      publishedArticles,
      draftArticles: articles.length - publishedArticles,
      totalViews: articles.reduce((sum, article) => sum + article.views, 0),
      totalShares: articles.reduce((sum, article) => sum + article.shares, 0),
      publishRate: articles.length === 0 ? 0 : Math.round((publishedArticles / articles.length) * 1000) / 10,
      recentlyUpdated: articles.slice(0, 4).map((article) => {
        const { content: _content, ...summary } = article;
        void _content;
        return summary;
      }),
    };
  }
}
