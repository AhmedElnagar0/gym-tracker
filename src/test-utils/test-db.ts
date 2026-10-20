/// <reference types="node" />
// (Node types: this test-only file reads the migration files with fs/path.)

// Test-only: a real, in-memory SQLite database (sql.js, SQLite compiled to WebAssembly)
// built from the same generated migrations that run on the phone, with foreign keys
// on as in src/db/init.ts. Never imported by app code.

import { drizzle } from 'drizzle-orm/sql-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import initSqlJs, { type SqlJsStatic } from 'sql.js';

import * as schema from '@/db/schema';
import { SEED_EXERCISES } from '@/db/seed-data';
import type { AppDb } from '@/db/types';

const ROOT = join(__dirname, '..', '..');
let SQL: SqlJsStatic | null = null;

export async function createTestDb({ seed = false }: { seed?: boolean } = {}): Promise<AppDb> {
  SQL ??= await initSqlJs();
  const sqlite = new SQL.Database();

  const journal = JSON.parse(readFileSync(join(ROOT, 'drizzle/meta/_journal.json'), 'utf8')) as {
    entries: { tag: string }[];
  };
  for (const { tag } of journal.entries) {
    const migration = readFileSync(join(ROOT, 'drizzle', `${tag}.sql`), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const db = drizzle(sqlite, { schema });
  if (seed) db.insert(schema.exercises).values(SEED_EXERCISES).run();
  return db;
}
