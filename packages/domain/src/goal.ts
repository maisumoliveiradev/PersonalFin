export const GOAL_NAME_MAX_LENGTH = 60;

export interface GoalSummary {
  remainingMinor: number;
  progressTenths: number;
  reached: boolean;
}

export function summarizeGoal(targetAmountMinor: number, accumulatedMinor: number): GoalSummary {
  const capped = Math.min(accumulatedMinor, targetAmountMinor);
  return {
    remainingMinor: targetAmountMinor - capped,
    progressTenths: Math.floor((capped * 1000) / targetAmountMinor),
    reached: accumulatedMinor >= targetAmountMinor,
  };
}
