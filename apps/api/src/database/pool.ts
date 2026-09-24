import pg from 'pg';

const DATE_TYPE_OID = 1082;

pg.types.setTypeParser(DATE_TYPE_OID, (value: string) => value);

export type DatabasePool = pg.Pool;
export type Queryable = pg.Pool | pg.PoolClient;

export function createPool(connectionString: string): DatabasePool {
  return new pg.Pool({ connectionString });
}

export async function withTransaction<T>(
  pool: DatabasePool,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
