import { createPool } from './pool.ts';

const USAGE = 'Usage: npm run admin -- grant <email> | revoke <email> | list\n';

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  process.stderr.write('DATABASE_URL is required\n');
  process.exit(1);
}

const [command, email] = process.argv.slice(2);
const pool = createPool(databaseUrl);
try {
  if (command === 'list') {
    const { rows } = await pool.query<{ email: string; granted_at: Date; granted_by: string }>(
      `SELECT u.email, a.granted_at, a.granted_by FROM platform_admin a
       JOIN "user" u ON u.id = a.user_id ORDER BY a.granted_at`,
    );
    for (const row of rows) {
      process.stdout.write(`${row.email}\t${row.granted_at.toISOString()}\t${row.granted_by}\n`);
    }
  } else if ((command === 'grant' || command === 'revoke') && email !== undefined) {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE lower(email) = lower($1)',
      [email],
    );
    const userId = rows[0]?.id;
    if (userId === undefined) {
      process.stderr.write(`No user with email ${email}\n`);
      process.exitCode = 1;
    } else if (command === 'grant') {
      await pool.query(
        `INSERT INTO platform_admin (user_id, granted_by) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, `cli:${process.env.USER ?? 'unknown'}`],
      );
      process.stdout.write(`${email} is a platform administrator\n`);
    } else {
      await pool.query('DELETE FROM platform_admin WHERE user_id = $1', [userId]);
      process.stdout.write(`${email} is no longer a platform administrator\n`);
    }
  } else {
    process.stderr.write(USAGE);
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
