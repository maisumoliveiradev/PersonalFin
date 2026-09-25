import { AsyncLocalStorage } from 'node:async_hooks';

import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';

interface RequestContext {
  method: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContextHook(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  storage.run({ method: request.method }, done);
}

export function isReadOnlyRequest(): boolean {
  const method = storage.getStore()?.method;
  return method === 'GET' || method === 'HEAD';
}
