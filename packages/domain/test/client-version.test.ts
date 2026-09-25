import { describe, expect, it } from 'vitest';

import {
  compareClientVersions,
  isClientVersionSupported,
  parseClientVersion,
} from '../src/client-version.ts';

describe('client versions', () => {
  it('parses MAJOR.MINOR.PATCH and rejects anything else', () => {
    expect(parseClientVersion('0.7.0')).toEqual([0, 7, 0]);
    expect(parseClientVersion(' 10.20.300 ')).toEqual([10, 20, 300]);
    for (const invalid of ['', '1', '1.2', '1.2.3.4', '01.2.3', '1.2.x', 'v1.2.3', '1.2.3-beta']) {
      expect(parseClientVersion(invalid)).toBeNull();
    }
  });

  it('compares numerically, not lexically', () => {
    expect(compareClientVersions([0, 10, 0], [0, 9, 9])).toBe(1);
    expect(compareClientVersions([1, 0, 0], [1, 0, 0])).toBe(0);
    expect(compareClientVersions([0, 6, 9], [0, 7, 0])).toBe(-1);
  });

  it('supports only valid versions at or above the minimum', () => {
    expect(isClientVersionSupported('0.7.0', [0, 7, 0])).toBe(true);
    expect(isClientVersionSupported('0.8.1', [0, 7, 0])).toBe(true);
    expect(isClientVersionSupported('0.6.9', [0, 7, 0])).toBe(false);
    expect(isClientVersionSupported(undefined, [0, 7, 0])).toBe(false);
    expect(isClientVersionSupported('garbage', [0, 7, 0])).toBe(false);
  });
});
