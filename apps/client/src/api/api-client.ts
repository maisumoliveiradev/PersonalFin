import type { paths } from '@personalfin/api-contract';
import createClient, { type Middleware } from 'openapi-fetch';

import { getSessionCookie } from '../auth/auth-client';
import { apiUrl, clientVersion } from '../config';
import { reportRequestFailure, reportRequestSuccess } from '../local/connectivity';
import { markUpgradeRequired } from './upgrade-required';

const UPGRADE_REQUIRED_STATUS = 426;

const attachSessionCookie: Middleware = {
  async onRequest({ request }) {
    const cookie = await getSessionCookie();
    if (cookie !== null) {
      request.headers.set('cookie', cookie);
    }
    return request;
  },
};

const clientVersionHeader: Middleware = {
  onRequest({ request }) {
    request.headers.set('x-client-version', clientVersion);
    return request;
  },
  onResponse({ response }) {
    if (response.status === UPGRADE_REQUIRED_STATUS) {
      markUpgradeRequired();
    }
    return response;
  },
};

async function trackedFetch(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    reportRequestSuccess();
    return response;
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      reportRequestFailure();
    }
    throw error;
  }
}

export const apiClient = createClient<paths>({
  baseUrl: apiUrl,
  credentials: 'include',
  fetch: trackedFetch,
});
apiClient.use(attachSessionCookie, clientVersionHeader);

export class ApiRequestError extends Error {
  override name = 'ApiRequestError';

  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(`API request failed with ${status} ${code}`);
    this.status = status;
    this.code = code;
  }
}

interface ApiResult<Data> {
  data?: Data;
  error?: { error?: { code?: string } };
  response: Response;
}

export function expectData<Data>(result: ApiResult<Data>): Data {
  if (result.data === undefined) {
    throw new ApiRequestError(result.response.status, result.error?.error?.code ?? 'UNKNOWN');
  }
  return result.data;
}
