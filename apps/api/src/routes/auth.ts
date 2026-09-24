import type { FastifyInstance, FastifyRequest } from 'fastify';

import { AUTH_BASE_PATH } from '../auth/better-auth.ts';
import { toFetchHeaders } from '../http/authenticate.ts';

export type AuthHandler = (request: Request) => Promise<Response>;

function toFetchRequest(request: FastifyRequest): Request {
  const url = new URL(request.url, `${request.protocol}://${request.host}`);
  const hasBody = request.body !== undefined && request.body !== null;
  return new Request(url, {
    method: request.method,
    headers: toFetchHeaders(request),
    body: hasBody ? JSON.stringify(request.body) : null,
  });
}

export function registerAuthRoutes(server: FastifyInstance, handler: AuthHandler): void {
  server.route({
    method: ['GET', 'POST'],
    url: `${AUTH_BASE_PATH}/*`,
    async handler(request, reply) {
      const response = await handler(toFetchRequest(request));
      reply.status(response.status);
      for (const [name, value] of response.headers) {
        if (name !== 'set-cookie') {
          reply.header(name, value);
        }
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) {
        reply.header('set-cookie', cookies);
      }
      return reply.send(response.body === null ? null : await response.text());
    },
  });
}
