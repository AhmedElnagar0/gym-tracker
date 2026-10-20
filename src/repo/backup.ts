import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { backupDatabaseAsync, deserializeDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';
import { Storage } from 'expo-sqlite/kv-store';

import { sqlite } from '@/db/client';
import { appliedMigrationCount, migrationTags, prepareDatabase, snapshot } from '@/db/init';
import {
  type BackupCounts,
  type BackupManifest,
  type BackupPhoto,
  backupFileName,
  buildBackupZip,
  compatibilityProblem,
  type Parsed,
  type ParsedBackup,
  parseBackupZip,
  PHOTO_NAME,
  toRollbackJournal,
} from '@/domain/backup-format';
import { nowUnix } from '@/domain/time';

import { backupDatabaseProblem, type RawQuery } from './backup-checks';

// Export and restore on the phone. The file format and its checks are in
// src/domain/backup-format.ts and ./backup-checks.ts (both unit-tested).

const LAST_EXPORT_KEY = 'backup.lastExportedAt';
const EXPORT_PREFIX = 'gym-tracker-backup-';

/** When a backup was last exported (unix seconds), or null if never. Per device. */
export function lastExportedAt(): number | null {
  const value = Storage.getItemSync(LAST_EXPORT_KEY);
  return value === null ? null : Number(value);
}

export function markExported(createdAt: number): void {
  Storage.setItemSync(LAST_EXPORT_KEY, String(createdAt));
}

/** Exercise photos live here (from M9); file names are "<uuid>.jpg". */
function photosDirectory(): Directory {
  return new Directory(Paths.document, 'photos');
}

function readPhotos(): BackupPhoto[] {
  const dir = photosDirectory();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((item): item is File => item instanceof File && PHOTO_NAME.test(item.name))
    .map((file) => ({ name: file.name, bytes: file.bytesSync() }));
}

const count = (table: string) =>
  sqlite.getFirstSync<{ n: number }>(`SELECT count(*) AS n FROM ${table}`)?.n ?? 0;

export function currentCounts(): BackupCounts {
  return { exercises: count('exercises'), workouts: count('workouts'), sets: count('sets'), splits: count('splits') };
}

/** Writes a backup zip to the cache folder, ready to hand to the share sheet. */
export async function createBackupFile(): Promise<{ file: File; manifest: BackupManifest }> {
  const createdAt = nowUnix();
  const applied = appliedMigrationCount();
  const tags = migrationTags();
  if (applied < 1 || applied > tags.length) throw new Error(`Unexpected migration state (${applied}).`);

  // A complete, consistent copy of the live database, switched out of WAL mode so it
  // can be reopened anywhere (see toRollbackJournal).
  const dbImage = toRollbackJournal(await sqlite.serializeAsync());
  const photos = readPhotos();
  const manifest: BackupManifest = {
    format: 'gym-tracker-backup',
    formatVersion: 1,
    createdAt,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    migrationsApplied: applied,
    lastMigrationTag: tags[applied - 1],
    counts: currentCounts(),
    photos: photos.map((p) => p.name),
  };
  const zip = buildBackupZip({ manifest, dbImage, photos });

  // Only the newest export is kept in the cache; older ones were already shared.
  for (const item of Paths.cache.list()) {
    if (item instanceof File && item.name.startsWith(EXPORT_PREFIX)) item.delete();
  }
  const file = new File(Paths.cache, backupFileName(createdAt));
  file.create();
  file.write(zip);
  return { file, manifest };
}

/** Reads a picked file and checks it can be restored. Changes nothing. */
export async function readBackup(uri: string): Promise<Parsed<ParsedBackup>> {
  const parsed = parseBackupZip(await new File(uri).bytes());
  if (!parsed.ok) return parsed;
  const problem = compatibilityProblem(parsed.value.manifest, migrationTags());
  if (problem) return { ok: false, error: problem };
  return parsed;
}

function replacePhotos(photos: BackupPhoto[]): void {
  const dir = photosDirectory();
  if (dir.exists) dir.delete();
  if (photos.length === 0) return;
  dir.create({ intermediates: true });
  for (const p of photos) {
    const file = new File(dir, p.name);
    file.create();
    file.write(p.bytes);
  }
}

export type RestoreResult = { ok: true; safetyCopy: string } | { ok: false; error: string };

/**
 * Replaces all app data with the backup's. Order matters:
 * 1. check the backup database (nothing touched yet)
 * 2. snapshot the current data on the phone
 * 3. copy the backup into the live database, run newer migrations, swap photos
 * If step 3 fails, the snapshot is copied back, so the app is never left half-restored.
 */
export async function restoreBackup(backup: ParsedBackup): Promise<RestoreResult> {
  const incoming = await deserializeDatabaseAsync(backup.dbImage);
  try {
    const query: RawQuery = (sql) => incoming.getAllSync<Record<string, unknown>>(sql);
    const livePageSize = sqlite.getFirstSync<{ page_size: number }>('PRAGMA page_size')?.page_size ?? 0;
    const problem = backupDatabaseProblem(query, {
      migrationsApplied: backup.manifest.migrationsApplied,
      pageSize: livePageSize,
    });
    if (problem) return { ok: false, error: problem };

    const safetyCopy = await snapshot('pre-restore');
    const previousPhotos = readPhotos();
    try {
      await backupDatabaseAsync({ sourceDatabase: incoming, destDatabase: sqlite });
      await prepareDatabase();
      replacePhotos(backup.photos);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      const previous = await openDatabaseAsync(safetyCopy);
      try {
        await backupDatabaseAsync({ sourceDatabase: previous, destDatabase: sqlite });
      } finally {
        await previous.closeAsync();
      }
      await prepareDatabase();
      replacePhotos(previousPhotos);
      return { ok: false, error: `Restore failed, so your previous data was put back. (${reason})` };
    }
    return { ok: true, safetyCopy };
  } finally {
    await incoming.closeAsync();
  }
}
