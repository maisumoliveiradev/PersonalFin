import { isValidMonth } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import {
  cancelInstallments,
  InstallmentPurchaseNotFoundError,
} from './card-installment-management.ts';

const paramsSchema = z.object({ spaceId: z.string(), purchaseId: z.string() });
const cancelSchema = z.strictObject({
  afterMonth: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)'),
});

export function registerCardInstallmentRoutes(server: FastifyInstance, data: DataAccess): void {
  server.post(
    '/financial-spaces/:spaceId/installment-purchases/:purchaseId/cancel',
    async (request): Promise<{ cancelled: number }> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(paramsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
      );
      if (!isUuid(params.purchaseId)) {
        throw new InstallmentPurchaseNotFoundError();
      }
      const { afterMonth } = parseInput(cancelSchema, request.body);
      const cancelled = await cancelInstallments(data, {
        financialSpaceId: space.id,
        purchaseId: params.purchaseId,
        afterMonth,
        actorUserId: user.id,
      });
      return { cancelled };
    },
  );
}
