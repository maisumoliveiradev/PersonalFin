import { afterAll, describe, expect, it } from 'vitest';

import { buildTestServer, sessionCookie } from './support/test-server.ts';

const user = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  email: 'ana@example.com',
  name: 'Ana',
};
const server = buildTestServer({ sessions: { 'valid-token': user } });

afterAll(async () => {
  await server.close();
});

describe('GET /me', () => {
  it('rejects requests without a session', async () => {
    const response = await server.inject({ method: 'GET', url: '/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
    });
  });

  it('rejects requests with an unknown session', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/me',
      headers: { cookie: sessionCookie('forged-token') },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns the user bound to a valid session', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/me',
      headers: { cookie: sessionCookie('valid-token') },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ...user, platformAdmin: false });
  });
});
