import type { CurrencyCode, FinancialDate } from '@personalfin/domain';

import { NotFoundError } from '../../http/errors.ts';

export type GoalScope =
  | { kind: 'global'; ownerUserId: string }
  | { kind: 'space'; financialSpaceId: string };

export interface Goal {
  id: string;
  ownerUserId: string;
  financialSpaceId: string | null;
  name: string;
  targetAmountMinor: number;
  accumulatedMinor: number;
  currency: CurrencyCode;
  targetDate: FinancialDate | null;
  archivedAt: Date | null;
  createdAt: Date;
  version: number;
}

export type NewGoal = Pick<
  Goal,
  | 'id'
  | 'ownerUserId'
  | 'financialSpaceId'
  | 'name'
  | 'targetAmountMinor'
  | 'currency'
  | 'targetDate'
>;

export interface GoalProgress {
  id: string;
  goalId: string;
  accumulatedMinor: number;
  recordedAt: Date;
}

export interface GoalUpdate {
  goalId: string;
  expectedVersion: number;
  name: string;
  targetAmountMinor: number;
  accumulatedMinor: number;
  targetDate: FinancialDate | null;
  archived: boolean;
}

export interface GoalRepository {
  list(scope: GoalScope): Promise<Goal[]>;
  find(scope: GoalScope, goalId: string, options?: { lock: boolean }): Promise<Goal | null>;
  create(goal: NewGoal): Promise<Goal>;
  update(update: GoalUpdate): Promise<Goal | null>;
  recordProgress(progress: {
    id: string;
    goalId: string;
    accumulatedMinor: number;
    recordedByUserId: string;
  }): Promise<GoalProgress>;
  listProgress(goalId: string): Promise<GoalProgress[]>;
}

export class GoalNotFoundError extends NotFoundError {
  constructor() {
    super('GOAL_NOT_FOUND', 'Goal not found');
  }
}

export function normalizeGoalName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
