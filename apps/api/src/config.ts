export const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface ApiConfig {
  appEnv: AppEnvironment;
  host: string;
  port: number;
  logLevel: LogLevel;
  databaseUrl: string;
  auth: AuthConfig;
}

export interface AuthConfig {
  secret: string;
  baseUrl: string;
  trustedOrigins: string[];
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

type Environment = Readonly<Record<string, string | undefined>>;

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 3333;
const DEFAULT_LOG_LEVEL: LogLevel = 'info';
const MAX_PORT = 65_535;
const MIN_AUTH_SECRET_LENGTH = 32;

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
}

function readRequired(env: Environment, name: string): string {
  const value = env[name];
  if (value === undefined || value === '') {
    throw new ConfigError(`${name} is required`);
  }
  return value;
}

function readAppEnvironment(env: Environment): AppEnvironment {
  const value = env.APP_ENV;
  if (value === undefined || !isOneOf(APP_ENVIRONMENTS, value)) {
    throw new ConfigError(`APP_ENV must be one of: ${APP_ENVIRONMENTS.join(', ')}`);
  }
  return value;
}

function readPort(env: Environment): number {
  const value = env.PORT;
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    throw new ConfigError(`PORT must be an integer between 1 and ${MAX_PORT}`);
  }
  return port;
}

function readLogLevel(env: Environment): LogLevel {
  const value = env.LOG_LEVEL;
  if (value === undefined || value === '') {
    return DEFAULT_LOG_LEVEL;
  }
  if (!isOneOf(LOG_LEVELS, value)) {
    throw new ConfigError(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}`);
  }
  return value;
}

function readUrl(env: Environment, name: string, protocols: readonly string[]): string {
  const value = readRequired(env, name);
  if (!URL.canParse(value) || !protocols.includes(new URL(value).protocol)) {
    throw new ConfigError(`${name} must be a URL using ${protocols.join(' or ')}`);
  }
  return value;
}

function readAuthSecret(env: Environment): string {
  const secret = readRequired(env, 'BETTER_AUTH_SECRET');
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new ConfigError(
      `BETTER_AUTH_SECRET must have at least ${MIN_AUTH_SECRET_LENGTH} characters`,
    );
  }
  return secret;
}

function readTrustedOrigins(env: Environment): string[] {
  const value = env.TRUSTED_ORIGINS;
  if (value === undefined || value.trim() === '') {
    return [];
  }
  const origins = value.split(',').map((origin) => origin.trim());
  const invalid = origins.filter((origin) => !URL.canParse(origin));
  if (invalid.length > 0) {
    throw new ConfigError(`TRUSTED_ORIGINS contains invalid entries: ${invalid.join(', ')}`);
  }
  return origins;
}

export function loadConfig(env: Environment): ApiConfig {
  return {
    appEnv: readAppEnvironment(env),
    host: env.HOST || DEFAULT_HOST,
    port: readPort(env),
    logLevel: readLogLevel(env),
    databaseUrl: readUrl(env, 'DATABASE_URL', ['postgres:', 'postgresql:']),
    auth: {
      secret: readAuthSecret(env),
      baseUrl: readUrl(env, 'BETTER_AUTH_URL', ['http:', 'https:']),
      trustedOrigins: readTrustedOrigins(env),
    },
  };
}
