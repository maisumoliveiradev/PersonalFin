import { afterAll, describe, expect, it } from 'vitest';

import type { AuthHandler } from '../src/routes/auth.ts';
import { buildTestServer } from './support/test-server.ts';

const received: Request[] = [];
const authHandler: AuthHandler = async (request) => {
  received.push(request);
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', 'personalfin.session_token=abc; HttpOnly; Path=/');
  headers.append('set-cookie', 'personalfin.session_data=def; HttpOnly; Path=/');
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
const server = buildTestServer({ authHandler });

afterAll(async () => {
  await server.close();
});

describe('auth route bridge', () => {
  it('forwards method, path, headers, and JSON body to the auth handler', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: 'http://localhost:8081' },
      payload: { email: 'ana@example.com', password: 'correct horse battery' },
    });

    const request = received.at(-1);
    expect(request?.method).toBe('POST');
    expect(new URL(request?.url ?? '').pathname).toBe('/api/auth/sign-in/email');
    expect(request?.headers.get('origin')).toBe('http://localhost:8081');
    expect(await request?.json()).toEqual({
      email: 'ana@example.com',
      password: 'correct horse battery',
    });
  });

  it('preserves every Set-Cookie header from the auth handler', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/auth/get-session' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['set-cookie']).toEqual([
      'personalfin.session_token=abc; HttpOnly; Path=/',
      'personalfin.session_data=def; HttpOnly; Path=/',
    ]);
    expect(response.json()).toEqual({ ok: true });
  });
});
