import type { AuditHistory } from '@personalfin/api-contract';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { ValidationError } from '../../http/errors.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { InvalidAuditCursorError } from './audit-repository.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const querySchema = z.object({
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function registerAuditRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/audit-events', async (request): Promise<AuditHistory> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view_audit',
    );
    const { cursor, limit } = parseInput(querySchema, request.query);
    try {
      const page = await data.repositories.audit.listForSpace(space.id, limit, cursor ?? null);
      return {
        items: page.items.map((event) => ({
          id: event.id,
          occurredAt: event.occurredAt.toISOString(),
          actorName: event.actorName,
          entityType: event.entityType,
          entityId: event.entityId,
          action: event.action,
          changes: event.changes,
          context: event.context ?? null,
        })),
        nextCursor: page.nextCursor,
      };
    } catch (error) {
      if (error instanceof InvalidAuditCursorError) {
        throw new ValidationError('cursor: invalid');
      }
      throw error;
    }
  });
}
