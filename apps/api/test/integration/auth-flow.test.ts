import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAuth, createSessionResolver } from '../../src/auth/better-auth.ts';
import { createPostgresDataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { buildServer } from '../../src/server.ts';
import { createMigratedTestPool } from './database.ts';

const ORIGIN = 'http://localhost:8081';
let pool: DatabasePool;
let server: FastifyInstance;

function cookiesFrom(setCookie: string | string[] | undefined): string {
  const values = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
  return values.map((value) => value.split(';')[0]).join('; ');
}

beforeAll(async () => {
  pool = await createMigratedTestPool();
  const auth = createAuth(
    {
      secret: 'integration-test-secret-with-32-characters',
      baseUrl: 'http://localhost:3333',
      trustedOrigins: [ORIGIN],
    },
    pool,
  );
  server = buildServer({
    appEnv: 'development',
    logLevel: 'silent',
    corsOrigins: [ORIGIN],
    sessionResolver: createSessionResolver(auth),
    authHandler: auth.handler,
    data: createPostgresDataAccess(pool),
  });
});

afterAll(async () => {
  await server.close();
  await pool.end();
});

async function signUp(email: string, password: string) {
  return server.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: { origin: ORIGIN },
    payload: { name: 'Ana', email, password },
  });
}

async function signIn(email: string, password: string) {
  return server.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: ORIGIN },
    payload: { email, password },
  });
}

describe('email/password authentication', () => {
  it('signs up, accesses the protected area, and signs out', async () => {
    const signUpResponse = await signUp('ana@example.com', 'correct-horse-battery');
    expect(signUpResponse.statusCode).toBe(200);
    const cookie = cookiesFrom(signUpResponse.headers['set-cookie']);

    const me = await server.inject({ method: 'GET', url: '/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: 'ana@example.com', name: 'Ana' });

    const signOut = await server.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { cookie, origin: ORIGIN },
      payload: {},
    });
    expect(signOut.statusCode).toBe(200);

    const afterSignOut = await server.inject({ method: 'GET', url: '/me', headers: { cookie } });
    expect(afterSignOut.statusCode).toBe(401);
  });

  it('signs in an existing user with the correct password', async () => {
    await signUp('bruno@example.com', 'correct-horse-battery');

    const response = await signIn('bruno@example.com', 'correct-horse-battery');
    const cookie = cookiesFrom(response.headers['set-cookie']);
    const me = await server.inject({ method: 'GET', url: '/me', headers: { cookie } });

    expect(response.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: 'bruno@example.com' });
  });

  it('rejects a wrong password without issuing a session', async () => {
    await signUp('carla@example.com', 'correct-horse-battery');

    const response = await signIn('carla@example.com', 'wrong-password-123');

    expect(response.statusCode).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a second account with the same email', async () => {
    await signUp('duda@example.com', 'correct-horse-battery');

    const duplicate = await signUp('duda@example.com', 'another-password-123');

    expect(duplicate.statusCode).toBe(422);
  });

  it('rejects passwords shorter than the minimum length', async () => {
    const response = await signUp('edu@example.com', 'short');

    expect(response.statusCode).toBe(400);
  });

  it('does not store the password in plain text', async () => {
    await signUp('fabi@example.com', 'correct-horse-battery');

    const { rows } = await pool.query<{ password: string }>(
      'SELECT a.password FROM account a JOIN "user" u ON u.id = a."userId" WHERE u.email = $1',
      ['fabi@example.com'],
    );

    expect(rows[0]?.password).toBeDefined();
    expect(rows[0]?.password).not.toContain('correct-horse-battery');
  });
});
