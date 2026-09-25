import { type ClientVersion, isClientVersionSupported } from '@personalfin/domain';
import type { FastifyRequest } from 'fastify';

import { AppError } from './errors.ts';

export const CLIENT_VERSION_HEADER = 'x-client-version';

const EXEMPT_PATH_PREFIXES = ['/health', '/api/auth/'];

export class ClientUpgradeRequiredError extends AppError {
  override name = 'ClientUpgradeRequiredError';

  constructor() {
    super(426, 'CLIENT_UPGRADE_REQUIRED', 'This app version is no longer supported; update it');
  }
}

function isExempt(request: FastifyRequest): boolean {
  if (request.method === 'OPTIONS') {
    return true;
  }
  const path = request.url.split('?')[0] ?? '';
  return EXEMPT_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function createClientVersionHook(minimum: ClientVersion) {
  return async (request: FastifyRequest): Promise<void> => {
    if (isExempt(request)) {
      return;
    }
    const header = request.headers[CLIENT_VERSION_HEADER];
    const version = Array.isArray(header) ? header[0] : header;
    if (!isClientVersionSupported(version, minimum)) {
      throw new ClientUpgradeRequiredError();
    }
  };
}
