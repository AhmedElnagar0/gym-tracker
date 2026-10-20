import { strToU8, zipSync } from 'fflate';

import {
  type BackupManifest,
  backupFileName,
  buildBackupZip,
  compatibilityProblem,
  isSqliteImage,
  parseBackupZip,
  toRollbackJournal,
  validateManifest,
} from './backup-format';
import { toUnix } from './time';

// A minimal fake database image: the 16-byte SQLite signature, WAL flags at 18/19.
function fakeImage(walByte = 2): Uint8Array {
  const bytes = new Uint8Array(4096);
  bytes.set(strToU8('SQLite format 3\u0000'), 0);
  bytes[18] = walByte;
  bytes[19] = walByte;
  return bytes;
}

const manifest = (overrides: Partial<BackupManifest> = {}): BackupManifest => ({
  format: 'gym-tracker-backup',
  formatVersion: 1,
  createdAt: 1792497600,
  appVersion: '1.0.0',
  migrationsApplied: 1,
  lastMigrationTag: '0000_init',
  counts: { exercises: 32, workouts: 0, sets: 0, splits: 0 },
  photos: [],
  ...overrides,
});

describe('backupFileName', () => {
  it('uses local date and time, zero-padded', () => {
    expect(backupFileName(toUnix(new Date(2026, 0, 5, 7, 3)))).toBe('gym-tracker-backup-2026-01-05-0703.zip');
  });
});

describe('database image helpers', () => {
  it('recognises the SQLite signature', () => {
    expect(isSqliteImage(fakeImage())).toBe(true);
    expect(isSqliteImage(strToU8('PK not a database at all, padded out to more than one hundred bytes......................'))).toBe(false);
  });

  it('switches a WAL image to rollback mode without changing the original', () => {
    const original = fakeImage(2);
    const converted = toRollbackJournal(original);
    expect([converted[18], converted[19]]).toEqual([1, 1]);
    expect([original[18], original[19]]).toEqual([2, 2]);
  });

  it('leaves a rollback image as rollback, and refuses non-databases or odd headers', () => {
    expect(toRollbackJournal(fakeImage(1))[18]).toBe(1);
    expect(() => toRollbackJournal(new Uint8Array(200))).toThrow(/Not an SQLite/);
    expect(() => toRollbackJournal(fakeImage(7))).toThrow(/header byte/);
  });
});

describe('backup zip', () => {
  const photo = { name: '3f2a9c1e-0000-4000-8000-000000000001.jpg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]) };

  it('round-trips manifest, database and photos', () => {
    const m = manifest({ photos: [photo.name] });
    const zip = buildBackupZip({ manifest: m, dbImage: fakeImage(1), photos: [photo] });
    const parsed = parseBackupZip(zip);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.manifest).toEqual(m);
    expect(isSqliteImage(parsed.value.dbImage)).toBe(true);
    expect(Array.from(parsed.value.photos[0].bytes)).toEqual(Array.from(photo.bytes));
  });

  it('rejects a file that is not a zip', () => {
    expect(parseBackupZip(strToU8('hello'))).toEqual({ ok: false, error: "This file isn't a valid zip." });
  });

  it('rejects a zip without a manifest', () => {
    const zip = zipSync({ 'gym.db': fakeImage() });
    expect(parseBackupZip(zip)).toMatchObject({ ok: false, error: expect.stringMatching(/no manifest/) });
  });

  it('rejects a zip from something else', () => {
    const zip = zipSync({ 'manifest.json': strToU8(JSON.stringify({ format: 'other-app' })) });
    expect(parseBackupZip(zip)).toMatchObject({ ok: false, error: expect.stringMatching(/isn't a Gym Tracker backup/) });
  });

  it('rejects a missing or non-SQLite gym.db', () => {
    const noDb = zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest())) });
    expect(parseBackupZip(noDb)).toMatchObject({ ok: false, error: expect.stringMatching(/gym\.db/) });
    const junkDb = zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest())), 'gym.db': new Uint8Array(500) });
    expect(parseBackupZip(junkDb)).toMatchObject({ ok: false, error: expect.stringMatching(/gym\.db/) });
  });

  it('rejects a backup whose listed photo is missing', () => {
    const zip = buildBackupZip({ manifest: manifest({ photos: [photo.name] }), dbImage: fakeImage(), photos: [] });
    expect(parseBackupZip(zip)).toMatchObject({ ok: false, error: expect.stringMatching(/photo .* is missing/) });
  });
});

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(validateManifest(manifest()).ok).toBe(true);
  });

  it('rejects a newer format version', () => {
    expect(validateManifest(manifest({ formatVersion: 2 as 1 }))).toMatchObject({ ok: false, error: expect.stringMatching(/version 2/) });
  });

  it('rejects photo names that could escape the photos folder', () => {
    expect(validateManifest(manifest({ photos: ['../../evil.jpg'] })).ok).toBe(false);
  });

  it('rejects missing or negative counts', () => {
    expect(validateManifest({ ...manifest(), counts: { exercises: -1, workouts: 0, sets: 0, splits: 0 } }).ok).toBe(false);
    expect(validateManifest({ ...manifest(), counts: undefined }).ok).toBe(false);
  });
});

describe('compatibilityProblem', () => {
  const app = ['0000_init', '0001_add_x'];

  it('accepts the same or an older schema', () => {
    expect(compatibilityProblem(manifest({ migrationsApplied: 2, lastMigrationTag: '0001_add_x' }), app)).toBeNull();
    expect(compatibilityProblem(manifest({ migrationsApplied: 1, lastMigrationTag: '0000_init' }), app)).toBeNull();
  });

  it('refuses a backup from a newer app', () => {
    expect(compatibilityProblem(manifest({ migrationsApplied: 3, lastMigrationTag: '0002_future' }), app)).toMatch(/newer version/);
  });

  it('refuses a backup whose history differs', () => {
    expect(compatibilityProblem(manifest({ migrationsApplied: 2, lastMigrationTag: '0001_something_else' }), app)).toMatch(/doesn't match/);
  });
});
