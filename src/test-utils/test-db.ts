/// <reference types="node" />
// (Node types: this test-only file reads the migration files with fs/path.)

// Test-only: a real, in-memory SQLite database (sql.js, SQLite compiled to WebAssembly)
// built from the same generated migrations that run on the phone, with foreign keys
// on as in src/db/init.ts. Never imported by app code.

import { drizzle } from 'drizzle-orm/sql-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

import * as schema from '@/db/schema';
import { SEED_EXERCISES } from '@/db/seed-data';
import type { AppDb } from '@/db/types';
import type { RawQuery } from '@/repo/backup-checks';

const ROOT = join(__dirname, '..', '..');
let SQL: SqlJsStatic | null = null;

export function migrationTags(): string[] {
  const journal = JSON.parse(readFileSync(join(ROOT, 'drizzle/meta/_journal.json'), 'utf8')) as {
    entries: { tag: string }[];
  };
  return journal.entries.map((e) => e.tag);
}

/** A raw sql.js database with every migration applied and foreign keys on. */
export async function createMigratedSqlite(): Promise<Database> {
  SQL ??= await initSqlJs();
  const sqlite = new SQL.Database();
  for (const tag of migrationTags()) {
    const migration = readFileSync(join(ROOT, 'drizzle', `${tag}.sql`), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }
  sqlite.exec('PRAGMA foreign_keys = ON;');
  return sqlite;
}

/** Opens a database image (e.g. a backup's gym.db) in sql.js. */
export async function openSqliteImage(image: Uint8Array): Promise<Database> {
  SQL ??= await initSqlJs();
  return new SQL.Database(image);
}

/** Adapts sql.js to the RawQuery shape used by backup-checks. */
export function rawQuery(sqlite: Database): RawQuery {
  return (sql) =>
    sqlite.exec(sql).flatMap(({ columns, values }) =>
      values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]]))),
    );
}

export async function createTestDb({ seed = false }: { seed?: boolean } = {}): Promise<AppDb> {
  const db = drizzle(await createMigratedSqlite(), { schema });
  if (seed) db.insert(schema.exercises).values(SEED_EXERCISES).run();
  return db;
}
