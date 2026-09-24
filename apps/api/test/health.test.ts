import { afterAll, describe, expect, it } from 'vitest';

import { buildTestServer } from './support/test-server.ts';

const server = buildTestServer();

afterAll(async () => {
  await server.close();
});

describe('GET /health', () => {
  it('reports that the API is running without requiring a session', async () => {
    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('returns the error contract for unknown routes', async () => {
    const response = await server.inject({ method: 'GET', url: '/unknown' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
});
