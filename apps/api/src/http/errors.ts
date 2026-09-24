import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function errorBody(code: string, message: string): ErrorBody {
  return { error: { code, message } };
}

const CLIENT_ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

export function handleError(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode ?? 500;
  if (statusCode < 500) {
    return reply
      .status(statusCode)
      .send(errorBody(CLIENT_ERROR_CODES[statusCode] ?? 'BAD_REQUEST', error.message));
  }
  request.log.error({ err: error }, 'Unhandled request error');
  return reply.status(500).send(errorBody('INTERNAL_ERROR', 'An unexpected error occurred'));
}

export function handleNotFound(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(404).send(errorBody('NOT_FOUND', 'Route not found'));
}
