import { afterAll, describe, expect, it } from 'vitest';

import { buildTestServer, sessionCookie } from './support/test-server.ts';

const user = { id: '00000000-0000-4000-8000-000000000001', name: 'Ana', email: 'ana@example.com' };

const guarded = buildTestServer({
  sessions: { 'valid-token': user },
  minClientVersion: [0, 7, 0],
});
const open = buildTestServer({ sessions: { 'valid-token': user } });

afterAll(async () => {
  await Promise.all([guarded.close(), open.close()]);
});

function getMe(server: typeof guarded, version?: string) {
  return server.inject({
    method: 'GET',
    url: '/me',
    headers: {
      cookie: sessionCookie('valid-token'),
      ...(version === undefined ? {} : { 'x-client-version': version }),
    },
  });
}

describe('minimum client version', () => {
  it('does not check versions when no minimum is configured', async () => {
    expect((await getMe(open)).statusCode).toBe(200);
    expect((await getMe(open, '0.1.0')).statusCode).toBe(200);
  });

  it('rejects older, missing, or invalid versions with 426', async () => {
    for (const version of ['0.6.9', undefined, 'abc']) {
      const response = await getMe(guarded, version);
      expect(response.statusCode).toBe(426);
      expect(response.json().error.code).toBe('CLIENT_UPGRADE_REQUIRED');
    }
  });

  it('accepts the minimum and newer versions', async () => {
    expect((await getMe(guarded, '0.7.0')).statusCode).toBe(200);
    expect((await getMe(guarded, '1.0.0')).statusCode).toBe(200);
  });

  it('checks the version before authentication', async () => {
    const response = await guarded.inject({ method: 'GET', url: '/me' });
    expect(response.statusCode).toBe(426);
  });

  it('keeps health and authentication reachable', async () => {
    expect((await guarded.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    const auth = await guarded.inject({ method: 'GET', url: '/api/auth/get-session' });
    expect(auth.statusCode).not.toBe(426);
  });
});
