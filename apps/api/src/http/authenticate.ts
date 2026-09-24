import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthenticatedUser, SessionResolver } from '../auth/authenticated-user.ts';
import { errorBody } from './errors.ts';

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser: AuthenticatedUser | null;
  }
}

export function toFetchHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

export function createAuthenticationHook(sessionResolver: SessionResolver) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await sessionResolver.resolve(toFetchHeaders(request));
    if (user === null) {
      return reply.status(401).send(errorBody('UNAUTHENTICATED', 'Authentication required'));
    }
    request.authenticatedUser = user;
  };
}

export function requireAuthenticatedUser(request: FastifyRequest): AuthenticatedUser {
  if (request.authenticatedUser === null) {
    throw new Error('Route registered outside the authenticated scope');
  }
  return request.authenticatedUser;
}
