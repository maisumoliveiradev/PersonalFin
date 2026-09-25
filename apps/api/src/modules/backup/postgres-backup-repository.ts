import type { Queryable } from '../../database/pool.ts';
import type { BackupRecord, BackupRepository, PersonalTable, SpaceTable } from './backup.ts';

const SPACE_QUERIES: Record<SpaceTable, string> = {
  category: 'SELECT * FROM category WHERE financial_space_id = $1',
  tag: 'SELECT * FROM tag WHERE financial_space_id = $1',
  financial_transaction: 'SELECT * FROM financial_transaction WHERE financial_space_id = $1',
  transaction_tag: 'SELECT * FROM transaction_tag WHERE financial_space_id = $1',
  recurrence_series: 'SELECT * FROM recurrence_series WHERE financial_space_id = $1',
  balance_snapshot: 'SELECT * FROM balance_snapshot WHERE financial_space_id = $1',
  card: 'SELECT * FROM card WHERE financial_space_id = $1',
  card_limit_change: 'SELECT * FROM card_limit_change WHERE financial_space_id = $1',
  card_invoice: 'SELECT * FROM card_invoice WHERE financial_space_id = $1',
  card_invoice_payment: 'SELECT * FROM card_invoice_payment WHERE financial_space_id = $1',
  card_installment_purchase:
    'SELECT * FROM card_installment_purchase WHERE financial_space_id = $1',
  debt: 'SELECT * FROM debt WHERE financial_space_id = $1',
  debt_payment: 'SELECT * FROM debt_payment WHERE financial_space_id = $1',
  goal: 'SELECT * FROM goal WHERE financial_space_id = $1',
  goal_progress: `SELECT p.* FROM goal_progress p JOIN goal g ON g.id = p.goal_id
    WHERE g.financial_space_id = $1`,
  import_batch: `SELECT id, financial_space_id, created_by_user_id, file_name, file_format,
    file_sha256, row_count, mapping, status, imported_count, created_at, confirmed_at, undone_at,
    version FROM import_batch WHERE financial_space_id = $1`,
  attachment: `SELECT id, financial_space_id, transaction_id, file_name, content_type, size_bytes,
    sha256, created_by_user_id, created_at, deleted_at, deleted_by_user_id
    FROM attachment WHERE financial_space_id = $1`,
  audit_event: 'SELECT * FROM audit_event WHERE financial_space_id = $1',
};

async function rows(db: Queryable, sql: string, values: unknown[]): Promise<BackupRecord[]> {
  const { rows: result } = await db.query<{ data: BackupRecord[] }>(
    `SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) AS data FROM (${sql}) t`,
    values,
  );
  return result[0]?.data ?? [];
}

export function createPostgresBackupRepository(db: Queryable): BackupRepository {
  return {
    spaceTable(table: SpaceTable, financialSpaceId: string) {
      return rows(db, SPACE_QUERIES[table], [financialSpaceId]);
    },
    personalTable(table: PersonalTable, userId: string, financialSpaceId: string) {
      return rows(db, `SELECT * FROM ${table} WHERE user_id = $1 AND financial_space_id = $2`, [
        userId,
        financialSpaceId,
      ]);
    },
    async globalGoals(userId: string) {
      const [goals, progress] = await Promise.all([
        rows(db, 'SELECT * FROM goal WHERE owner_user_id = $1 AND financial_space_id IS NULL', [
          userId,
        ]),
        rows(
          db,
          `SELECT p.* FROM goal_progress p JOIN goal g ON g.id = p.goal_id
           WHERE g.owner_user_id = $1 AND g.financial_space_id IS NULL`,
          [userId],
        ),
      ]);
      return { goals, progress };
    },
  };
}
