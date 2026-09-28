import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import type { ArticleRepository } from './article-repository.js';
import { parseArticleId, parseCreateArticle, parseUpdateArticle } from './article-schema.js';
import type { AdminAuthenticator } from './auth.js';
import { HttpError } from './http-error.js';

interface CreateAppOptions {
  articleRepository: ArticleRepository;
  authenticateAdmin: AdminAuthenticator;
  staticDirectory?: string;
}

function sendData(response: Response, data: unknown): void {
  response.json({ data });
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response).catch(next);
  };
}

function toPublicError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  console.error('Unhandled API error', error instanceof Error ? error.message : error);
  return new HttpError(500, 'INTERNAL_ERROR', '服务暂时不可用，请稍后重试');
}

export function createApp({ articleRepository, authenticateAdmin, staticDirectory }: CreateAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', asyncRoute(async (_request, response) => {
    await articleRepository.healthcheck();
    sendData(response, { status: 'ok' });
  }));

  app.get('/api/articles', asyncRoute(async (_request, response) => {
    sendData(response, await articleRepository.listPublished());
  }));

  app.get('/api/articles/:id', asyncRoute(async (request, response) => {
    const id = parseArticleId(request.params.id);
    const article = await articleRepository.findPublishedById(id);
    if (!article) throw new HttpError(404, 'ARTICLE_NOT_FOUND', '文章不存在或尚未发布');
    sendData(response, article);
  }));

  app.post('/api/articles/:id/view', asyncRoute(async (request, response) => {
    const id = parseArticleId(request.params.id);
    const counts = await articleRepository.incrementViews(id);
    if (!counts) throw new HttpError(404, 'ARTICLE_NOT_FOUND', '文章不存在或尚未发布');
    sendData(response, counts);
  }));

  app.post('/api/articles/:id/share', asyncRoute(async (request, response) => {
    const id = parseArticleId(request.params.id);
    const counts = await articleRepository.incrementShares(id);
    if (!counts) throw new HttpError(404, 'ARTICLE_NOT_FOUND', '文章不存在或尚未发布');
    sendData(response, counts);
  }));

  const adminRouter = express.Router();
  adminRouter.use((request, _response, next) => {
    void authenticateAdmin(request).then(() => next()).catch(next);
  });

  adminRouter.get('/articles', asyncRoute(async (_request, response) => {
    sendData(response, await articleRepository.listAll());
  }));

  adminRouter.post('/articles', asyncRoute(async (request, response) => {
    const article = await articleRepository.create(parseCreateArticle(request.body));
    response.status(201);
    sendData(response, article);
  }));

  adminRouter.patch('/articles/:id', asyncRoute(async (request, response) => {
    const id = parseArticleId(request.params.id);
    const article = await articleRepository.update(id, parseUpdateArticle(request.body));
    if (!article) throw new HttpError(404, 'ARTICLE_NOT_FOUND', '文章不存在');
    sendData(response, article);
  }));

  adminRouter.delete('/articles/:id', asyncRoute(async (request, response) => {
    const id = parseArticleId(request.params.id);
    const deleted = await articleRepository.delete(id);
    if (!deleted) throw new HttpError(404, 'ARTICLE_NOT_FOUND', '文章不存在');
    response.status(204).send();
  }));

  adminRouter.get('/dashboard', asyncRoute(async (_request, response) => {
    sendData(response, await articleRepository.getDashboard());
  }));

  app.use('/api/admin', adminRouter);

  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.get(/.*/, (request, response, next) => {
      if (request.path === '/api' || request.path.startsWith('/api/')) return next();
      return response.sendFile(path.join(staticDirectory, 'index.html'));
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } });
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    void _next;
    const publicError = toPublicError(error);
    response.status(publicError.status).json({
      error: {
        code: publicError.code,
        message: publicError.message,
        ...(publicError.fieldErrors ? { fieldErrors: publicError.fieldErrors } : {}),
      },
    });
  });

  return app;
}
