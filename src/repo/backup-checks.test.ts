import { drizzle } from 'drizzle-orm/sql-js';
import type { Database } from 'sql.js';

import * as schema from '@/db/schema';
import { SEED_EXERCISES } from '@/db/seed-data';
import { buildBackupZip, parseBackupZip, toRollbackJournal, type BackupManifest } from '@/domain/backup-format';
import { createMigratedSqlite, migrationTags, openSqliteImage, rawQuery } from '@/test-utils/test-db';

import { APP_TABLES, backupDatabaseProblem } from './backup-checks';

// What Drizzle's migrator leaves behind on the phone (the test DB applies SQL directly).
function addMigrationHistory(sqlite: Database, rows: number) {
  sqlite.exec('CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash text NOT NULL, created_at numeric)');
  for (let i = 0; i < rows; i++) sqlite.exec(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('h${i}', ${i})`);
}

async function phoneLikeDb(): Promise<Database> {
  const sqlite = await createMigratedSqlite();
  drizzle(sqlite, { schema }).insert(schema.exercises).values(SEED_EXERCISES).run();
  addMigrationHistory(sqlite, migrationTags().length);
  return sqlite;
}

const expected = () => ({ migrationsApplied: migrationTags().length, pageSize: 4096 });

describe('APP_TABLES', () => {
  it('lists all eight schema tables', () => {
    expect(APP_TABLES).toEqual([
      'exercises',
      'sets',
      'split_day_exercises',
      'split_days',
      'split_schedule',
      'splits',
      'workout_exercises',
      'workouts',
    ]);
  });
});

describe('backupDatabaseProblem', () => {
  it('accepts a sound database', async () => {
    expect(backupDatabaseProblem(rawQuery(await phoneLikeDb()), expected())).toBeNull();
  });

  it('rejects a database missing a table', async () => {
    const sqlite = await phoneLikeDb();
    sqlite.exec('PRAGMA foreign_keys = OFF; DROP TABLE split_schedule;');
    expect(backupDatabaseProblem(rawQuery(sqlite), expected())).toMatch(/missing tables: split_schedule/);
  });

  it('rejects a database without migration history', async () => {
    const sqlite = await createMigratedSqlite();
    expect(backupDatabaseProblem(rawQuery(sqlite), expected())).toMatch(/no migration history/);
  });

  it('rejects a database whose version disagrees with its manifest', async () => {
    const sqlite = await phoneLikeDb();
    expect(backupDatabaseProblem(rawQuery(sqlite), { ...expected(), migrationsApplied: 5 })).toMatch(/doesn't match its manifest/);
  });

  it('rejects a different page size', async () => {
    expect(backupDatabaseProblem(rawQuery(await phoneLikeDb()), { ...expected(), pageSize: 8192 })).toMatch(/page size/);
  });

  it('rejects broken references', async () => {
    const sqlite = await phoneLikeDb();
    sqlite.exec("PRAGMA foreign_keys = OFF; INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps) VALUES ('s', 'missing', 0, 1, 1);");
    expect(backupDatabaseProblem(rawQuery(sqlite), expected())).toMatch(/broken references/);
  });
});

describe('full round trip through a backup zip', () => {
  it('a real database survives export → zip → parse → reopen, with all rows', async () => {
    const source = await phoneLikeDb();
    const manifest: BackupManifest = {
      format: 'gym-tracker-backup',
      formatVersion: 1,
      createdAt: 1792497600,
      appVersion: '1.0.0',
      migrationsApplied: migrationTags().length,
      lastMigrationTag: migrationTags().at(-1)!,
      counts: { exercises: 32, workouts: 0, sets: 0, splits: 0 },
      photos: [],
    };
    const zip = buildBackupZip({ manifest, dbImage: toRollbackJournal(source.export()), photos: [] });

    const parsed = parseBackupZip(zip);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const restored = await openSqliteImage(parsed.value.dbImage);
    expect(backupDatabaseProblem(rawQuery(restored), expected())).toBeNull();
    expect(rawQuery(restored)('SELECT count(*) AS n FROM exercises')[0].n).toBe(32);
  });
});
