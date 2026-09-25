import { randomUUID } from 'node:crypto';

import type {
  ExchangeRateList,
  ExchangeRate as ExchangeRateResponse,
} from '@personalfin/api-contract';
import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  isValidFinancialDate,
  isValidRate,
  normalizeRate,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import type { ExchangeRate } from './exchange-rate.ts';

const FOREIGN_CURRENCIES = CURRENCY_CODES.filter((code) => code !== DEFAULT_CURRENCY) as [
  string,
  ...string[],
];

const spaceParamsSchema = z.object({ spaceId: z.string() });
const dateSchema = z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');
const listQuerySchema = z.object({ currency: z.enum(FOREIGN_CURRENCIES).optional() });
const latestQuerySchema = z.object({ currency: z.enum(FOREIGN_CURRENCIES), on: dateSchema });
const recordSchema = z.strictObject({
  currency: z.enum(FOREIGN_CURRENCIES),
  rateDate: dateSchema,
  rate: z.string().refine(isValidRate, 'must be a positive decimal with up to 10 decimals'),
});

export function toRateResponse(rate: ExchangeRate): ExchangeRateResponse {
  return {
    id: rate.id,
    currency: rate.currency,
    baseCurrency: rate.baseCurrency,
    rateDate: rate.rateDate,
    rate: rate.rate,
    source: rate.source,
    recordedAt: rate.recordedAt.toISOString(),
  };
}

export function registerExchangeRateRoutes(server: FastifyInstance, data: DataAccess): void {
  async function space(
    request: Parameters<typeof requireAuthenticatedUser>[0],
    permission: 'view' | 'record',
  ) {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const accessible = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      permission,
    );
    return { userId: user.id, spaceId: accessible.id };
  }

  server.get(
    '/financial-spaces/:spaceId/exchange-rates',
    async (request): Promise<ExchangeRateList> => {
      const { spaceId } = await space(request, 'view');
      const { currency } = parseInput(listQuerySchema, request.query);
      const rates = await data.repositories.exchangeRates.list(
        spaceId,
        currency as ExchangeRate['currency'] | undefined,
      );
      return { baseCurrency: DEFAULT_CURRENCY, items: rates.map(toRateResponse) };
    },
  );

  server.get(
    '/financial-spaces/:spaceId/exchange-rates/latest',
    async (request): Promise<{ rate: ExchangeRateResponse | null }> => {
      const { spaceId } = await space(request, 'view');
      const { currency, on } = parseInput(latestQuerySchema, request.query);
      const rate = await data.repositories.exchangeRates.latest(
        spaceId,
        currency as ExchangeRate['currency'],
        on,
      );
      return { rate: rate === null ? null : toRateResponse(rate) };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/exchange-rates',
    async (request, reply): Promise<ExchangeRateResponse> => {
      const { userId, spaceId } = await space(request, 'record');
      const input = parseInput(recordSchema, request.body);
      const rate = await data.repositories.exchangeRates.record({
        id: randomUUID(),
        financialSpaceId: spaceId,
        currency: input.currency as ExchangeRate['currency'],
        baseCurrency: DEFAULT_CURRENCY,
        rateDate: input.rateDate,
        rate: normalizeRate(input.rate),
        source: 'manual',
        recordedByUserId: userId,
      });
      reply.status(201);
      return toRateResponse(rate);
    },
  );
}
