export type ArticleStatus = 'published' | 'draft';

export interface ArticleSummary {
  id: string;
  title: string;
  summary: string;
  coverImage: string | null;
  publishDate: string;
  views: number;
  shares: number;
  status: ArticleStatus;
  category: string | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Article extends ArticleSummary {
  content: string;
}

export interface ArticleInput {
  title: string;
  summary: string;
  content: string;
  coverImage: string | null;
  publishDate: string;
  views: number;
  shares: number;
  status: ArticleStatus;
  category: string | null;
  author: string | null;
}

export interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  totalShares: number;
  publishRate: number;
  recentlyUpdated: ArticleSummary[];
}
