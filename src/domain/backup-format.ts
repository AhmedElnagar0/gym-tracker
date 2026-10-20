import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

import { fromUnix } from './time';

// The backup file: a .zip containing
//   manifest.json   what's inside (format version, schema version, row counts)
//   gym.db          a complete SQLite database (opens in Python: sqlite3.connect('gym.db'))
//   photos/*.jpg    exercise photos (from M9)
// Pure functions only: the phone-specific parts live in src/repo/backup.ts.

export const BACKUP_FORMAT = 'gym-tracker-backup';
export const BACKUP_FORMAT_VERSION = 1;
const MANIFEST_ENTRY = 'manifest.json';
const DB_ENTRY = 'gym.db';
const PHOTO_PREFIX = 'photos/';
/** Photo file names the app creates: "<uuid>.jpg". Anything else (e.g. "../x") is rejected. */
export const PHOTO_NAME = /^[A-Za-z0-9-]{1,64}\.jpg$/;

export type BackupCounts = { exercises: number; workouts: number; sets: number; splits: number };

export type BackupManifest = {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  createdAt: number; // unix seconds
  appVersion: string;
  migrationsApplied: number;
  lastMigrationTag: string;
  counts: BackupCounts;
  photos: string[];
};

export type BackupPhoto = { name: string; bytes: Uint8Array };
export type ParsedBackup = { manifest: BackupManifest; dbImage: Uint8Array; photos: BackupPhoto[] };
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** e.g. "gym-tracker-backup-2026-10-20-1705.zip", in local time. */
export function backupFileName(createdAt: number): string {
  const d = fromUnix(createdAt);
  return `gym-tracker-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
}

const SQLITE_MAGIC = 'SQLite format 3\u0000';

export function isSqliteImage(bytes: Uint8Array): boolean {
  if (bytes.length < 100) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i++) if (bytes[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  return true;
}

/**
 * Returns a copy of a database image switched from WAL to rollback-journal mode
 * (header bytes 18 and 19: 2 = WAL, 1 = rollback; https://sqlite.org/fileformat.html).
 * The app runs in WAL mode, and SQLite can't open a WAL-flagged image in memory
 * ("unable to open database file"). The image itself is a complete, consistent copy,
 * so only the flag changes.
 */
export function toRollbackJournal(image: Uint8Array): Uint8Array {
  if (!isSqliteImage(image)) throw new Error('Not an SQLite database image.');
  const copy = image.slice();
  for (const i of [18, 19]) {
    if (copy[i] !== 1 && copy[i] !== 2) throw new Error(`Unexpected SQLite header byte ${i}: ${copy[i]}`);
    copy[i] = 1;
  }
  return copy;
}

export function buildBackupZip({ manifest, dbImage, photos }: ParsedBackup): Uint8Array {
  const entries: Zippable = {
    [MANIFEST_ENTRY]: [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }],
    [DB_ENTRY]: [dbImage, { level: 6 }],
  };
  // JPEGs are already compressed; store them as-is.
  for (const p of photos) entries[`${PHOTO_PREFIX}${p.name}`] = [p.bytes, { level: 0 }];
  return zipSync(entries);
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

export function validateManifest(value: unknown): Parsed<BackupManifest> {
  const bad = (why: string): Parsed<BackupManifest> => ({ ok: false, error: `The backup's manifest is invalid (${why}).` });
  if (typeof value !== 'object' || value === null) return bad('not an object');
  const m = value as Record<string, unknown>;
  if (m.format !== BACKUP_FORMAT) return { ok: false, error: "This zip isn't a Gym Tracker backup." };
  if (m.formatVersion !== BACKUP_FORMAT_VERSION)
    return { ok: false, error: `Backup format version ${String(m.formatVersion)} isn't supported by this app.` };
  if (!isCount(m.createdAt)) return bad('createdAt');
  if (typeof m.appVersion !== 'string') return bad('appVersion');
  if (!isCount(m.migrationsApplied) || m.migrationsApplied < 1) return bad('migrationsApplied');
  if (typeof m.lastMigrationTag !== 'string' || m.lastMigrationTag === '') return bad('lastMigrationTag');
  const c = m.counts as Record<string, unknown> | undefined;
  if (!c || !isCount(c.exercises) || !isCount(c.workouts) || !isCount(c.sets) || !isCount(c.splits)) return bad('counts');
  if (!Array.isArray(m.photos) || !m.photos.every((p) => typeof p === 'string' && PHOTO_NAME.test(p)))
    return bad('photos');
  return { ok: true, value: m as BackupManifest };
}

/** Reads and checks a backup zip without touching the app's data. */
export function parseBackupZip(zip: Uint8Array): Parsed<ParsedBackup> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zip);
  } catch {
    return { ok: false, error: "This file isn't a valid zip." };
  }

  const manifestBytes = files[MANIFEST_ENTRY];
  if (!manifestBytes) return { ok: false, error: "This zip isn't a Gym Tracker backup (no manifest.json)." };
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(strFromU8(manifestBytes));
  } catch {
    return { ok: false, error: "The backup's manifest.json can't be read." };
  }
  const manifest = validateManifest(manifestJson);
  if (!manifest.ok) return manifest;

  const dbImage = files[DB_ENTRY];
  if (!dbImage || !isSqliteImage(dbImage)) return { ok: false, error: 'The backup has no valid database (gym.db).' };

  const photos: BackupPhoto[] = [];
  for (const name of manifest.value.photos) {
    const bytes = files[`${PHOTO_PREFIX}${name}`];
    if (!bytes) return { ok: false, error: `The backup is incomplete: photo ${name} is missing.` };
    photos.push({ name, bytes });
  }
  return { ok: true, value: { manifest: manifest.value, dbImage, photos } };
}

/**
 * Whether this app can restore the backup. `appMigrationTags` are this app's migrations
 * in order. An older backup is fine (newer migrations run after restoring); a newer one
 * isn't, and a different history at the same position means a different schema.
 */
export function compatibilityProblem(manifest: BackupManifest, appMigrationTags: readonly string[]): string | null {
  if (manifest.migrationsApplied > appMigrationTags.length) {
    return 'This backup was made by a newer version of the app. Update the app, then restore.';
  }
  if (appMigrationTags[manifest.migrationsApplied - 1] !== manifest.lastMigrationTag) {
    return "This backup's database version doesn't match this app's history, so it can't be restored safely.";
  }
  return null;
}
