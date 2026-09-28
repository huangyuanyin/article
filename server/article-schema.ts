import { z } from 'zod';
import type { ArticleInput } from '../shared/article.js';
import { HttpError } from './http-error.js';

const articleIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, '文章 ID 格式无效');
const statusSchema = z.enum(['published', 'draft']);
const nullableText = z.string().trim().max(500).nullable();
const coverImageSchema = z.union([
  z.string().url().refine((value) => /^https?:\/\//i.test(value), '封面必须使用 http 或 https URL'),
  z.null(),
]);
const dateSchema = z.string().datetime({ offset: true });
const countSchema = z.number().int().min(0);

const articleFields = {
  title: z.string().trim().min(1, '标题不能为空').max(200, '标题不能超过 200 个字符'),
  summary: z.string().max(2000),
  content: z.string().max(100_000),
  coverImage: coverImageSchema,
  publishDate: dateSchema,
  views: countSchema,
  shares: countSchema,
  status: statusSchema,
  category: nullableText,
  author: nullableText,
};

export const createArticleSchema = z.object({
  ...articleFields,
  summary: articleFields.summary.default(''),
  content: articleFields.content.default(''),
  coverImage: articleFields.coverImage.default(null),
  views: articleFields.views.default(0),
  shares: articleFields.shares.default(0),
  status: articleFields.status.default('draft'),
  category: articleFields.category.default(null),
  author: articleFields.author.default(null),
}).strict();
export const updateArticleSchema = z.object(articleFields).partial().strict();

function throwValidation(error: z.ZodError): never {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'body';
    fieldErrors[field] ??= [];
    fieldErrors[field].push(issue.message);
  }
  throw new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', fieldErrors);
}

export function parseArticleId(value: unknown): string {
  const result = articleIdSchema.safeParse(value);
  if (!result.success) throwValidation(result.error);
  return result.data;
}

export function parseCreateArticle(input: unknown): ArticleInput {
  const result = createArticleSchema.safeParse(input);
  if (!result.success) throwValidation(result.error);
  return result.data as ArticleInput;
}

export function parseUpdateArticle(input: unknown): Partial<ArticleInput> {
  const result = updateArticleSchema.safeParse(input);
  if (!result.success) throwValidation(result.error);
  return result.data as Partial<ArticleInput>;
}
