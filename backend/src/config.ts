import { existsSync } from 'node:fs';

export type NodeEnv = 'development' | 'production' | 'test';

export interface Config {
  readonly PORT: number;
  readonly DB_PATH: string;
  readonly CORS_ORIGIN: readonly string[];
  readonly NODE_ENV: NodeEnv;
}

// Load a local .env file when present (never in tests, so they stay deterministic).
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT: "${raw}"`);
  }
  return port;
}

function parseOrigins(raw: string | undefined, fallback: string): string[] {
  const origins = (raw ?? fallback)
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return origins.length > 0 ? origins : [fallback];
}

function parseNodeEnv(raw: string | undefined): NodeEnv {
  return raw === 'production' || raw === 'test' ? raw : 'development';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return Object.freeze({
    PORT: parsePort(env.PORT, 3000),
    DB_PATH: env.DB_PATH?.trim() || './data/esms.db',
    CORS_ORIGIN: Object.freeze(parseOrigins(env.CORS_ORIGIN, 'http://localhost:4200')),
    NODE_ENV: parseNodeEnv(env.NODE_ENV),
  });
}

export const config: Config = loadConfig();
