import { db, sqlite } from './client';
import { exercises } from './schema';
import { SEED_EXERCISES } from './seed-data';

// Bump this when seed-data.ts gains new exercises. Stored in SQLite's PRAGMA user_version
// (Drizzle doesn't use it), so seeding runs once per version — an exercise you delete
// is NOT re-created on the next launch.
const SEED_VERSION = 1;

export function seedExercises(): void {
  const current = sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version;')?.user_version ?? 0;
  if (current >= SEED_VERSION) return;

  sqlite.withTransactionSync(() => {
    // onConflictDoNothing: skips rows whose id or name already exists, never overwrites.
    db.insert(exercises).values(SEED_EXERCISES).onConflictDoNothing().run();
    sqlite.execSync(`PRAGMA user_version = ${SEED_VERSION};`);
  });
}
