import { is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';

// Checks run on a backup's database BEFORE it replaces the app's data.
// Written against a bare "run this SQL, give me rows" function so the same code runs
// on the phone (expo-sqlite) and in tests (sql.js).

export type RawQuery = (sql: string) => Record<string, unknown>[];

/** Names of every table in our schema, e.g. ["exercises", "sets", …]. */
export const APP_TABLES: string[] = Object.values(schema as Record<string, unknown>)
  .filter((value): value is SQLiteTable => is(value, SQLiteTable))
  .map((table) => getTableConfig(table).name)
  .sort();

const firstValue = (rows: Record<string, unknown>[]) => (rows[0] ? Object.values(rows[0])[0] : undefined);

/** Returns a reason the database can't be restored, or null if it looks sound. */
export function backupDatabaseProblem(
  query: RawQuery,
  expected: { migrationsApplied: number; pageSize: number },
): string | null {
  const integrity = firstValue(query('PRAGMA quick_check'));
  if (integrity !== 'ok') return `The backup's database is damaged (${String(integrity)}).`;

  const present = new Set(
    query(`SELECT name FROM sqlite_master WHERE type = 'table'`).map((r) => String(r.name)),
  );
  const missing = APP_TABLES.filter((t) => !present.has(t));
  if (missing.length > 0) return `The backup's database is missing tables: ${missing.join(', ')}.`;
  if (!present.has('__drizzle_migrations')) return "The backup's database has no migration history.";

  const applied = Number(firstValue(query('SELECT count(*) AS n FROM __drizzle_migrations')));
  if (applied !== expected.migrationsApplied) {
    return `The backup's database version (${applied}) doesn't match its manifest (${expected.migrationsApplied}).`;
  }

  // Copying pages into the live database needs the same page size.
  const pageSize = Number(firstValue(query('PRAGMA page_size')));
  if (pageSize !== expected.pageSize) return `Unsupported database page size ${pageSize}.`;

  if (query('PRAGMA foreign_key_check').length > 0) return "The backup's database has broken references.";
  return null;
}
