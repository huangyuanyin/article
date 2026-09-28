import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { loadConfig } from './config';
import {
  fakeAdminAuthenticator,
  InMemoryArticleRepository,
  withTestClient,
} from './test/fakes';

const validEnv = {
  PORT: '3001',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  ADMIN_EMAILS: 'admin@example.com, editor@example.com',
};

describe('server configuration', () => {
  it.each(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAILS'] as const)(
    'names a missing %s variable',
    (key) => {
      const env = { ...validEnv };
      delete env[key];
      expect(() => loadConfig(env)).toThrow(key);
    },
  );

  it('normalizes the administrator email allowlist', () => {
    expect(loadConfig(validEnv).adminEmails).toEqual(
      new Set(['admin@example.com', 'editor@example.com']),
    );
  });
});

describe('production static hosting', () => {
  it('serves the SPA for client routes but keeps unknown API routes as JSON 404', async () => {
    const staticDirectory = await mkdtemp(path.join(tmpdir(), 'article-static-'));
    await writeFile(path.join(staticDirectory, 'index.html'), '<html><body>article app</body></html>');

    try {
      const app = createApp({
        articleRepository: new InMemoryArticleRepository(),
        authenticateAdmin: fakeAdminAuthenticator,
        staticDirectory,
      });

      await withTestClient(app, async (client) => {
        const pageResponse = await client.get('/article/art-001');
        expect(pageResponse.status).toBe(200);
        expect(pageResponse.text).toContain('article app');

        const apiResponse = await client.get('/api/does-not-exist');
        expect(apiResponse.status).toBe(404);
        expect(apiResponse.type).toMatch(/json/);
        expect(apiResponse.body.error.code).toBe('NOT_FOUND');

        const apiRootResponse = await client.get('/api');
        expect(apiRootResponse.status).toBe(404);
        expect(apiRootResponse.type).toMatch(/json/);
      });
    } finally {
      await rm(staticDirectory, { recursive: true, force: true });
    }
  });
});
