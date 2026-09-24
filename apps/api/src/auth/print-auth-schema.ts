import { getMigrations } from 'better-auth/db/migration';

import { createPool } from '../database/pool.ts';
import { createAuth } from './better-auth.ts';

const pool = createPool(process.env.DATABASE_URL ?? '');
const auth = createAuth(
  { secret: 'x'.repeat(32), baseUrl: 'http://localhost:3333', trustedOrigins: [] },
  pool,
);
const { compileMigrations } = await getMigrations(auth.options);
process.stdout.write(await compileMigrations());
await pool.end();
