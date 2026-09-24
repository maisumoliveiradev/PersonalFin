import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.ts';

const required = {
  APP_ENV: 'development',
  DATABASE_URL: 'postgres://user:pass@127.0.0.1:5433/personalfin_dev',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://127.0.0.1:3333',
};

describe('loadConfig', () => {
  it('applies defaults when only required variables are provided', () => {
    expect(loadConfig(required)).toEqual({
      appEnv: 'development',
      host: 'localhost',
      port: 3333,
      logLevel: 'info',
      databaseUrl: required.DATABASE_URL,
      auth: {
        secret: required.BETTER_AUTH_SECRET,
        baseUrl: required.BETTER_AUTH_URL,
        trustedOrigins: [],
      },
    });
  });

  it('reads explicit values', () => {
    const config = loadConfig({
      ...required,
      APP_ENV: 'staging',
      HOST: '0.0.0.0',
      PORT: '8080',
      LOG_LEVEL: 'warn',
      TRUSTED_ORIGINS: 'http://localhost:8081, personalfin://',
    });

    expect(config).toMatchObject({
      appEnv: 'staging',
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'warn',
    });
    expect(config.auth.trustedOrigins).toEqual(['http://localhost:8081', 'personalfin://']);
  });

  it('rejects a missing APP_ENV instead of assuming an environment', () => {
    const { APP_ENV: _omitted, ...withoutEnvironment } = required;
    expect(() => loadConfig(withoutEnvironment)).toThrow(ConfigError);
  });

  it('rejects an unknown APP_ENV', () => {
    expect(() => loadConfig({ ...required, APP_ENV: 'prod' })).toThrow(ConfigError);
  });

  it.each(['0', '65536', '80.5', 'abc'])('rejects invalid PORT %s', (port) => {
    expect(() => loadConfig({ ...required, PORT: port })).toThrow(ConfigError);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => loadConfig({ ...required, LOG_LEVEL: 'verbose' })).toThrow(ConfigError);
  });

  it.each(['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'])(
    'rejects a missing %s',
    (name) => {
      expect(() => loadConfig({ ...required, [name]: '' })).toThrow(ConfigError);
    },
  );

  it('rejects a non-Postgres DATABASE_URL', () => {
    expect(() => loadConfig({ ...required, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      ConfigError,
    );
  });

  it('rejects a short BETTER_AUTH_SECRET', () => {
    expect(() => loadConfig({ ...required, BETTER_AUTH_SECRET: 'short' })).toThrow(ConfigError);
  });

  it('rejects invalid TRUSTED_ORIGINS entries', () => {
    expect(() => loadConfig({ ...required, TRUSTED_ORIGINS: 'not a url' })).toThrow(ConfigError);
  });
});
