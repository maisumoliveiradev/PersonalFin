import type {
  Goal,
  GoalProgress,
  GoalRepository,
  GoalScope,
} from '../../src/modules/goals/goal.ts';

function inScope(goal: Goal, scope: GoalScope): boolean {
  return scope.kind === 'global'
    ? goal.financialSpaceId === null && goal.ownerUserId === scope.ownerUserId
    : goal.financialSpaceId === scope.financialSpaceId;
}

export function createInMemoryGoalRepository(): GoalRepository & {
  goals: Goal[];
  progress: GoalProgress[];
} {
  const goals: Goal[] = [];
  const progress: GoalProgress[] = [];
  return {
    goals,
    progress,
    async list(scope) {
      return goals.filter((goal) => inScope(goal, scope));
    },
    async find(scope, goalId) {
      return goals.find((goal) => goal.id === goalId && inScope(goal, scope)) ?? null;
    },
    async create(goal) {
      const created: Goal = {
        ...goal,
        accumulatedMinor: 0,
        archivedAt: null,
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, goals.length)),
        version: 1,
      };
      goals.push(created);
      return created;
    },
    async update(update) {
      const index = goals.findIndex(
        (goal) => goal.id === update.goalId && goal.version === update.expectedVersion,
      );
      const current = goals[index];
      if (current === undefined) {
        return null;
      }
      const updated: Goal = {
        ...current,
        name: update.name,
        targetAmountMinor: update.targetAmountMinor,
        accumulatedMinor: update.accumulatedMinor,
        targetDate: update.targetDate,
        archivedAt: update.archived ? (current.archivedAt ?? new Date()) : null,
        version: current.version + 1,
      };
      goals[index] = updated;
      return updated;
    },
    async recordProgress({ recordedByUserId: _recordedBy, ...entry }) {
      const created = {
        ...entry,
        recordedAt: new Date(Date.UTC(2026, 0, 1, 12, 0, progress.length)),
      };
      progress.push(created);
      return created;
    },
    async listProgress(goalId) {
      return progress.filter((entry) => entry.goalId === goalId).reverse();
    },
  };
}
