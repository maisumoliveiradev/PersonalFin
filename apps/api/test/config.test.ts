import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('applies defaults when only APP_ENV is provided', () => {
    expect(loadConfig({ APP_ENV: 'development' })).toEqual({
      appEnv: 'development',
      host: '127.0.0.1',
      port: 3333,
      logLevel: 'info',
    });
  });

  it('reads explicit values', () => {
    expect(
      loadConfig({ APP_ENV: 'staging', HOST: '0.0.0.0', PORT: '8080', LOG_LEVEL: 'warn' }),
    ).toEqual({ appEnv: 'staging', host: '0.0.0.0', port: 8080, logLevel: 'warn' });
  });

  it('rejects a missing APP_ENV instead of assuming an environment', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });

  it('rejects an unknown APP_ENV', () => {
    expect(() => loadConfig({ APP_ENV: 'prod' })).toThrow(ConfigError);
  });

  it.each(['0', '65536', '80.5', 'abc'])('rejects invalid PORT %s', (port) => {
    expect(() => loadConfig({ APP_ENV: 'development', PORT: port })).toThrow(ConfigError);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => loadConfig({ APP_ENV: 'development', LOG_LEVEL: 'verbose' })).toThrow(ConfigError);
  });
});
