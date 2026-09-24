import type { paths } from '@personalfin/api-contract';
import createClient, { type Middleware } from 'openapi-fetch';

import { getSessionCookie } from '../auth/auth-client';
import { apiUrl } from '../config';

const attachSessionCookie: Middleware = {
  async onRequest({ request }) {
    const cookie = await getSessionCookie();
    if (cookie !== null) {
      request.headers.set('cookie', cookie);
    }
    return request;
  },
};

export const apiClient = createClient<paths>({ baseUrl: apiUrl, credentials: 'include' });
apiClient.use(attachSessionCookie);

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
