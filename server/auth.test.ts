import type { Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createAdminAuthenticator } from './auth';

function requestWithAuthorization(authorization?: string): Request {
  return {
    header: (name: string) => name.toLowerCase() === 'authorization' ? authorization : undefined,
  } as Request;
}

function authClient(result: { email?: string; error?: Error }) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: result.email ? { email: result.email } : null },
        error: result.error ?? null,
      }),
    },
  } as unknown as Pick<SupabaseClient, 'auth'>;
}

describe('createAdminAuthenticator', () => {
  it('rejects requests without a bearer token', async () => {
    const authenticate = createAdminAuthenticator(authClient({}), new Set(['admin@example.com']));
    await expect(authenticate(requestWithAuthorization())).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects invalid Supabase sessions', async () => {
    const authenticate = createAdminAuthenticator(
      authClient({ error: new Error('invalid token') }),
      new Set(['admin@example.com']),
    );
    await expect(authenticate(requestWithAuthorization('Bearer invalid'))).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects authenticated users outside the administrator allowlist', async () => {
    const authenticate = createAdminAuthenticator(
      authClient({ email: 'reader@example.com' }),
      new Set(['admin@example.com']),
    );
    await expect(authenticate(requestWithAuthorization('Bearer reader-token'))).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('accepts allowlisted emails case-insensitively', async () => {
    const authenticate = createAdminAuthenticator(
      authClient({ email: 'Admin@Example.com' }),
      new Set(['admin@example.com']),
    );
    await expect(authenticate(requestWithAuthorization('Bearer admin-token'))).resolves.toBeUndefined();
  });
});
