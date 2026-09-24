import pg from 'pg';

export type DatabasePool = pg.Pool;

export function createPool(connectionString: string): DatabasePool {
  return new pg.Pool({ connectionString });
}
