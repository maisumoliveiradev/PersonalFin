import { describe, expect, it } from 'vitest';

import { summarizeGoal } from '../src/goal.ts';

describe('goal summary', () => {
  it('reports remaining amount and progress rounded down', () => {
    expect(summarizeGoal(300_000, 100_000)).toEqual({
      remainingMinor: 200_000,
      progressTenths: 333,
      reached: false,
    });
    expect(summarizeGoal(1_000, 999).progressTenths).toBe(999);
  });

  it('caps progress at 100% once the target is reached or passed', () => {
    expect(summarizeGoal(1_000, 1_000)).toEqual({
      remainingMinor: 0,
      progressTenths: 1000,
      reached: true,
    });
    expect(summarizeGoal(1_000, 5_000)).toEqual({
      remainingMinor: 0,
      progressTenths: 1000,
      reached: true,
    });
  });

  it('starts at zero', () => {
    expect(summarizeGoal(1_000, 0)).toEqual({
      remainingMinor: 1_000,
      progressTenths: 0,
      reached: false,
    });
  });
});
