import type {
  GoalDetail as GoalDetailResponse,
  GoalList,
  Goal as GoalResponse,
} from '@personalfin/api-contract';
import {
  GOAL_NAME_MAX_LENGTH,
  isValidAmountMinor,
  isValidFinancialDate,
  MAX_AMOUNT_MINOR,
  summarizeGoal,
} from '@personalfin/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { type Goal, GoalNotFoundError, type GoalScope, normalizeGoalName } from './goal.ts';
import { createGoal, type GoalDetail, updateGoal } from './goal-management.ts';

const nameSchema = z
  .string()
  .transform(normalizeGoalName)
  .pipe(z.string().min(1).max(GOAL_NAME_MAX_LENGTH));
const targetSchema = z
  .number()
  .refine(isValidAmountMinor, `must be an integer from 1 to ${MAX_AMOUNT_MINOR}`);
const accumulatedSchema = z.number().int().min(0).max(MAX_AMOUNT_MINOR);
const dateSchema = z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');

const createGoalSchema = z.strictObject({
  name: nameSchema,
  targetAmountMinor: targetSchema,
  targetDate: dateSchema.nullable().optional(),
});

const updateGoalSchema = z.strictObject({
  version: z.number().int().min(1),
  name: nameSchema.optional(),
  targetAmountMinor: targetSchema.optional(),
  targetDate: dateSchema.nullable().optional(),
  archived: z.boolean().optional(),
});

const progressSchema = z.strictObject({
  version: z.number().int().min(1),
  accumulatedMinor: accumulatedSchema,
});

function toGoalResponse(goal: Goal): GoalResponse {
  return {
    id: goal.id,
    scope: goal.financialSpaceId === null ? 'global' : 'space',
    name: goal.name,
    targetAmountMinor: goal.targetAmountMinor,
    accumulatedMinor: goal.accumulatedMinor,
    currency: goal.currency,
    targetDate: goal.targetDate,
    archived: goal.archivedAt !== null,
    version: goal.version,
    summary: summarizeGoal(goal.targetAmountMinor, goal.accumulatedMinor),
  };
}

function toGoalDetail({ goal, progress }: GoalDetail): GoalDetailResponse {
  return {
    ...toGoalResponse(goal),
    progress: progress.map((entry) => ({
      accumulatedMinor: entry.accumulatedMinor,
      recordedAt: entry.recordedAt.toISOString(),
    })),
  };
}

type Access = 'read' | 'write';

type ScopeResolver = (request: FastifyRequest, access: Access) => Promise<GoalScope>;

const spaceParamsSchema = z.object({ spaceId: z.string() }).loose();

function registerGoalScope(
  server: FastifyInstance,
  data: DataAccess,
  prefix: string,
  resolveScope: ScopeResolver,
): void {
  const goalParamsSchema = z.object({ goalId: z.string() }).loose();
  const goalIdOf = (request: FastifyRequest) => {
    const { goalId } = parseInput(goalParamsSchema, request.params);
    if (!isUuid(goalId)) {
      throw new GoalNotFoundError();
    }
    return goalId;
  };

  server.get(prefix, async (request): Promise<GoalList> => {
    const scope = await resolveScope(request, 'read');
    return { items: (await data.repositories.goals.list(scope)).map(toGoalResponse) };
  });

  server.post(prefix, async (request, reply): Promise<GoalDetailResponse> => {
    const user = requireAuthenticatedUser(request);
    const scope = await resolveScope(request, 'write');
    const input = parseInput(createGoalSchema, request.body);
    const detail = await createGoal(data, {
      scope,
      actorUserId: user.id,
      name: input.name,
      targetAmountMinor: input.targetAmountMinor,
      targetDate: input.targetDate ?? null,
    });
    reply.status(201);
    return toGoalDetail(detail);
  });

  server.get(`${prefix}/:goalId`, async (request): Promise<GoalDetailResponse> => {
    const scope = await resolveScope(request, 'read');
    const goal = await data.repositories.goals.find(scope, goalIdOf(request));
    if (goal === null) {
      throw new GoalNotFoundError();
    }
    return toGoalDetail({ goal, progress: await data.repositories.goals.listProgress(goal.id) });
  });

  server.patch(`${prefix}/:goalId`, async (request): Promise<GoalDetailResponse> => {
    const user = requireAuthenticatedUser(request);
    const scope = await resolveScope(request, 'write');
    const { version, ...changes } = parseInput(updateGoalSchema, request.body);
    const detail = await updateGoal(data, {
      scope,
      goalId: goalIdOf(request),
      actorUserId: user.id,
      expectedVersion: version,
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.targetAmountMinor === undefined
        ? {}
        : { targetAmountMinor: changes.targetAmountMinor }),
      ...(changes.targetDate === undefined ? {} : { targetDate: changes.targetDate }),
      ...(changes.archived === undefined ? {} : { archived: changes.archived }),
    });
    return toGoalDetail(detail);
  });

  server.post(`${prefix}/:goalId/progress`, async (request): Promise<GoalDetailResponse> => {
    const user = requireAuthenticatedUser(request);
    const scope = await resolveScope(request, 'write');
    const input = parseInput(progressSchema, request.body);
    const detail = await updateGoal(data, {
      scope,
      goalId: goalIdOf(request),
      actorUserId: user.id,
      expectedVersion: input.version,
      accumulatedMinor: input.accumulatedMinor,
    });
    return toGoalDetail(detail);
  });
}

export function registerGoalRoutes(server: FastifyInstance, data: DataAccess): void {
  registerGoalScope(server, data, '/goals', async (request) => ({
    kind: 'global',
    ownerUserId: requireAuthenticatedUser(request).id,
  }));
  registerGoalScope(server, data, '/financial-spaces/:spaceId/goals', async (request, access) => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      access === 'read' ? 'view' : 'plan',
    );
    return { kind: 'space', financialSpaceId: space.id };
  });
}
