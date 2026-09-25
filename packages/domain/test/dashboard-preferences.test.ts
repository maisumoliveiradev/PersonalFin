import { describe, expect, it } from 'vitest';

import { normalizeOverrides, resolveDashboardSections } from '../src/dashboard-preferences.ts';

describe('dashboard preferences', () => {
  it('shows only the balance and realized summary for the basic profile', () => {
    expect(resolveDashboardSections('basic', {})).toEqual({
      observedBalance: true,
      realized: true,
      forecast: false,
      projection: false,
      projectionSeries: false,
      commitments: false,
      analytics: false,
    });
  });

  it('shows every section for the advanced profile', () => {
    expect(Object.values(resolveDashboardSections('advanced', {})).every(Boolean)).toBe(true);
  });

  it('applies overrides on top of the profile', () => {
    const sections = resolveDashboardSections('intermediate', {
      projection: false,
      analytics: true,
    });

    expect(sections).toMatchObject({ forecast: true, projection: false, analytics: true });
  });

  it('drops overrides that match the profile default', () => {
    expect(
      normalizeOverrides('basic', { realized: true, forecast: true, analytics: false }),
    ).toEqual({ forecast: true });
  });
});
