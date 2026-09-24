export const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface ApiConfig {
  appEnv: AppEnvironment;
  host: string;
  port: number;
  logLevel: LogLevel;
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

type Environment = Readonly<Record<string, string | undefined>>;

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3333;
const DEFAULT_LOG_LEVEL: LogLevel = 'info';
const MAX_PORT = 65_535;

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
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

export function loadConfig(env: Environment): ApiConfig {
  return {
    appEnv: readAppEnvironment(env),
    host: env.HOST || DEFAULT_HOST,
    port: readPort(env),
    logLevel: readLogLevel(env),
  };
}
