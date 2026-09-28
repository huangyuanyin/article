import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './api';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps the data envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: 'art-001' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(apiRequest('/api/articles')).resolves.toEqual([{ id: 'art-001' }]);
  });

  it('throws ApiError from the error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: '标题不能为空',
              fieldErrors: { title: ['标题不能为空'] },
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(apiRequest('/api/admin/articles')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '标题不能为空',
      fieldErrors: { title: ['标题不能为空'] },
    });
  });

  it('returns undefined for a 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest('/api/admin/articles/art-001', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('adds an authorization header without dropping caller headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/admin/articles', { headers: { 'X-Request-Id': 'request-1' } }, 'access-token');

    const requestHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.get('Authorization')).toBe('Bearer access-token');
    expect(requestHeaders.get('X-Request-Id')).toBe('request-1');
  });

  it('uses a stable fallback for non-JSON server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 })));

    const request = apiRequest('/api/articles');

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: '请求失败，请稍后重试',
    });
  });
});
