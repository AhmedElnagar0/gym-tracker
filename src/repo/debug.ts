import migrations from '../../drizzle/migrations';
import { sqlite } from '@/db/client';
import { appliedMigrationCount, foreignKeysEnabled } from '@/db/init';

export type DbStatus = {
  foreignKeys: boolean;
  exercises: number;
  workouts: number;
  sets: number;
  migrationsApplied: number;
  migrationsTotal: number;
};

const count = (table: string) =>
  sqlite.getFirstSync<{ n: number }>(`SELECT count(*) AS n FROM ${table}`)?.n ?? 0;

/** Row counts and safety settings, for the temporary debug line (removed in M6). */
export function getDbStatus(): DbStatus {
  return {
    foreignKeys: foreignKeysEnabled(),
    exercises: count('exercises'),
    workouts: count('workouts'),
    sets: count('sets'),
    migrationsApplied: appliedMigrationCount(),
    migrationsTotal: migrations.journal.entries.length,
  };
}
