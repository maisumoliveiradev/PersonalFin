import { randomUUID } from 'node:crypto';

import { DEFAULT_CURRENCY, type FinancialDate } from '@personalfin/domain';

import type { DataAccess, Repositories } from '../../database/data-access.ts';
import { type AuditAction, diffFields, type FieldChange } from '../audit/audit-event.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import { type Goal, GoalNotFoundError, type GoalProgress, type GoalScope } from './goal.ts';

export interface GoalDetail {
  goal: Goal;
  progress: GoalProgress[];
}

async function auditSpaceGoal(
  repositories: Repositories,
  goal: Goal,
  actorUserId: string,
  action: AuditAction,
  changes: Record<string, FieldChange>,
): Promise<void> {
  if (goal.financialSpaceId === null) {
    return;
  }
  await repositories.audit.record({
    financialSpaceId: goal.financialSpaceId,
    entityType: 'goal',
    entityId: goal.id,
    action,
    actorUserId,
    changes,
  });
}

export async function createGoal(
  data: DataAccess,
  input: {
    scope: GoalScope;
    actorUserId: string;
    name: string;
    targetAmountMinor: number;
    targetDate: FinancialDate | null;
  },
): Promise<GoalDetail> {
  return data.transaction(async (repositories) => {
    const goal = await repositories.goals.create({
      id: randomUUID(),
      ownerUserId: input.actorUserId,
      financialSpaceId: input.scope.kind === 'space' ? input.scope.financialSpaceId : null,
      name: input.name,
      targetAmountMinor: input.targetAmountMinor,
      currency: DEFAULT_CURRENCY,
      targetDate: input.targetDate,
    });
    await auditSpaceGoal(repositories, goal, input.actorUserId, 'create', {
      name: { before: null, after: goal.name },
      targetAmountMinor: { before: null, after: goal.targetAmountMinor },
      targetDate: { before: null, after: goal.targetDate },
    });
    return { goal, progress: [] };
  });
}

export async function updateGoal(
  data: DataAccess,
  input: {
    scope: GoalScope;
    goalId: string;
    actorUserId: string;
    expectedVersion: number;
    name?: string;
    targetAmountMinor?: number;
    targetDate?: FinancialDate | null;
    archived?: boolean;
    accumulatedMinor?: number;
  },
): Promise<GoalDetail> {
  return data.transaction(async (repositories) => {
    const current = await repositories.goals.find(input.scope, input.goalId, { lock: true });
    if (current === null) {
      throw new GoalNotFoundError();
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const before = {
      name: current.name,
      targetAmountMinor: current.targetAmountMinor,
      accumulatedMinor: current.accumulatedMinor,
      targetDate: current.targetDate,
      archived: current.archivedAt !== null,
    };
    const after = {
      name: input.name ?? before.name,
      targetAmountMinor: input.targetAmountMinor ?? before.targetAmountMinor,
      accumulatedMinor: input.accumulatedMinor ?? before.accumulatedMinor,
      targetDate: input.targetDate === undefined ? before.targetDate : input.targetDate,
      archived: input.archived ?? before.archived,
    };
    const changes = diffFields(before, after);
    if (Object.keys(changes).length === 0) {
      return { goal: current, progress: await repositories.goals.listProgress(current.id) };
    }
    const updated = await repositories.goals.update({
      goalId: current.id,
      expectedVersion: input.expectedVersion,
      ...after,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    if (changes.accumulatedMinor !== undefined) {
      await repositories.goals.recordProgress({
        id: randomUUID(),
        goalId: current.id,
        accumulatedMinor: after.accumulatedMinor,
        recordedByUserId: input.actorUserId,
      });
    }
    await auditSpaceGoal(repositories, updated, input.actorUserId, 'update', changes);
    return { goal: updated, progress: await repositories.goals.listProgress(current.id) };
  });
}
