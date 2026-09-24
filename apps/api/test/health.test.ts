import { afterAll, describe, expect, it } from 'vitest';

import { buildServer } from '../src/server.ts';

const server = buildServer({
  appEnv: 'development',
  host: '127.0.0.1',
  port: 0,
  logLevel: 'silent',
});

afterAll(async () => {
  await server.close();
});

describe('GET /health', () => {
  it('reports that the API is running', async () => {
    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
