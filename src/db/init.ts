import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { backupDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';

import { nowUnix } from '@/domain/time';

import migrations from '../../drizzle/migrations';
import { db, sqlite } from './client';
import { seedExercises } from './seed';

let initPromise: Promise<void> | null = null;

/**
 * Prepares the database. Runs once per app launch, before any screen renders;
 * calling it again returns the same promise.
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) initPromise = runInit();
  return initPromise;
}

async function runInit(): Promise<void> {
  sqlite.execSync('PRAGMA journal_mode = WAL;');

  // Foreign keys stay OFF while migrating. Drizzle runs migrations inside a transaction,
  // where SQLite ignores PRAGMA foreign_keys, and a migration that rebuilds a table
  // would otherwise cascade-delete child rows. This is SQLite's documented procedure:
  // https://www.sqlite.org/lang_altertable.html#otheralter
  sqlite.execSync('PRAGMA foreign_keys = OFF;');

  const applied = appliedMigrationCount();
  const pending = migrations.journal.entries.length - applied;
  if (applied > 0 && pending > 0) {
    // Existing data is about to be migrated: keep a copy first.
    await snapshot('pre-migration');
  }

  await migrate(db, migrations);

  const violations = sqlite.getAllSync('PRAGMA foreign_key_check;');
  if (violations.length > 0) {
    throw new Error(
      `The database has ${violations.length} broken reference(s) after migrating. ` +
        'Nothing was deleted; a pre-migration snapshot exists if a migration ran.',
    );
  }

  // SQLite ships with foreign keys OFF. Without this, ON DELETE CASCADE / RESTRICT
  // silently do nothing. It applies to this connection for the rest of the session.
  sqlite.execSync('PRAGMA foreign_keys = ON;');
  if (!foreignKeysEnabled()) throw new Error('Could not enable foreign key enforcement.');

  seedExercises();
}

export function foreignKeysEnabled(): boolean {
  return sqlite.getFirstSync<{ foreign_keys: number }>('PRAGMA foreign_keys;')?.foreign_keys === 1;
}

export function appliedMigrationCount(): number {
  const hasTable = sqlite.getFirstSync<{ n: number }>(
    `SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`,
  );
  if (!hasTable || hasTable.n === 0) return 0;
  return sqlite.getFirstSync<{ n: number }>('SELECT count(*) AS n FROM __drizzle_migrations')?.n ?? 0;
}

// Copies the live database into a new file next to it, e.g. "pre-migration-1760971200.db".
// This guards against a bad migration; it does NOT survive deleting Expo Go (see docs/PLAN.md §2).
async function snapshot(reason: string): Promise<void> {
  const dest = await openDatabaseAsync(`${reason}-${nowUnix()}.db`);
  try {
    await backupDatabaseAsync({ sourceDatabase: sqlite, destDatabase: dest });
  } finally {
    await dest.closeAsync();
  }
}
