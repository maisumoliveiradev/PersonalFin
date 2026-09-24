import type { DatabasePool } from '../../src/database/pool.ts';

export async function insertUser(pool: DatabasePool, email: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "user" (name, email, "emailVerified", "updatedAt")
     VALUES ($1, $2, false, now())
     RETURNING id`,
    ['Test User', email],
  );
  const [row] = rows;
  if (row === undefined) {
    throw new Error('User insert returned no row');
  }
  return row.id;
}
