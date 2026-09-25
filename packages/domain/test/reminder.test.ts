import { describe, expect, it } from 'vitest';

import { reminderStage, reminderWindowDays } from '../src/reminder.ts';

describe('reminder stages (DR-095)', () => {
  it('starts at the largest chosen offset and moves to smaller ones', () => {
    const offsets = [0, 3, 7] as const;
    expect(reminderStage(8, offsets)).toBeNull();
    expect(reminderStage(7, offsets)).toBe('before-7');
    expect(reminderStage(5, offsets)).toBe('before-7');
    expect(reminderStage(3, offsets)).toBe('before-3');
    expect(reminderStage(1, offsets)).toBe('before-3');
    expect(reminderStage(0, offsets)).toBe('before-0');
  });

  it('treats past due dates as overdue regardless of offsets', () => {
    expect(reminderStage(-1, [0])).toBe('overdue');
    expect(reminderStage(-30, [7])).toBe('overdue');
  });

  it('keeps the last chosen stage until the due date passes', () => {
    expect(reminderStage(0, [1])).toBe('before-1');
    expect(reminderStage(2, [1])).toBeNull();
  });

  it('measures the lookahead window from the offsets', () => {
    expect(reminderWindowDays([0, 3])).toBe(3);
    expect(reminderWindowDays([])).toBe(0);
  });
});
