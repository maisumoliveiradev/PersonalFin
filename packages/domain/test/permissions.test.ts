import { describe, expect, it } from 'vitest';

import { normalizePermissions, presetOf } from '../src/permissions.ts';

describe('space permissions', () => {
  it('always includes view and keeps the catalog order without duplicates', () => {
    expect(normalizePermissions(['record', 'record'])).toEqual(['view', 'record']);
    expect(normalizePermissions([])).toEqual(['view']);
  });

  it('recognizes presets and custom sets', () => {
    expect(presetOf(['view'])).toBe('viewer');
    expect(presetOf(['record'])).toBe('contributor');
    expect(presetOf(['view', 'record', 'plan', 'classify', 'manage_members', 'view_audit'])).toBe(
      'administrator',
    );
    expect(presetOf(['view', 'classify'])).toBeNull();
  });
});
