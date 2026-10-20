import { eq, sql } from 'drizzle-orm';

import { exercises, splitDayExercises, splitDays, splits, workoutExercises, workouts } from '@/db/schema';
import { BENCH_PRESS, INCLINE_BENCH_PRESS, LAT_PULLDOWN } from '@/db/seed-data';
import type { AppDb } from '@/db/types';
import type { ExerciseDraft } from '@/domain/validation';
import { createTestDb } from '@/test-utils/test-db';

import {
  catalogueQuery,
  createExercise,
  createVariant,
  deleteExercise,
  getExercise,
  getUsage,
  getVariants,
  setArchived,
  updateExercise,
} from './exercises';

// expo-crypto is native; in tests use Node's UUID generator instead.
jest.mock('@/db/ids', () => ({
  newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID(),
}));

const draft = (overrides: Partial<ExerciseDraft> = {}): ExerciseDraft => ({
  name: 'Cable Fly',
  variantLabel: null,
  muscleGroup: 'chest',
  mechanic: 'isolation',
  equipment: 'cable',
  isUnilateral: false,
  ...overrides,
});

// Logs the exercise in a finished workout, so it has "history".
function logWorkoutWith(db: AppDb, exerciseId: string, n = 1) {
  db.insert(workouts).values({ id: `w-${n}`, startedAt: 1000 * n, endedAt: 1000 * n + 500 }).run();
  db.insert(workoutExercises).values({ id: `we-${n}`, workoutId: `w-${n}`, exerciseId, orderIndex: 0 }).run();
}

let db: AppDb;
beforeEach(async () => {
  db = await createTestDb({ seed: true });
});

describe('catalogueQuery', () => {
  it('returns the 32 seeded exercises', () => {
    expect(catalogueQuery(db).all()).toHaveLength(32);
  });
});

describe('createExercise', () => {
  it('creates a top-level exercise with a normalized name', () => {
    const result = createExercise(db, draft({ name: '  Cable   Fly ' }));
    expect(result.ok).toBe(true);
    const created = result.ok ? getExercise(db, result.value) : undefined;
    expect(created).toMatchObject({ name: 'Cable Fly', parentId: null, muscleGroup: 'chest', archivedAt: null });
  });

  it('rejects a name that exists in a different case', () => {
    const result = createExercise(db, draft({ name: 'bench PRESS' }));
    expect(result).toMatchObject({ ok: false, fields: { name: expect.any(String) } });
  });

  it('returns field errors instead of writing invalid data', () => {
    const result = createExercise(db, draft({ name: '', equipment: null }));
    expect(result).toMatchObject({ ok: false, fields: { name: expect.any(String), equipment: expect.any(String) } });
    expect(catalogueQuery(db).all()).toHaveLength(32);
  });
});

describe('createVariant', () => {
  it('copies muscle group and mechanic from the parent, ignoring the draft', () => {
    const result = createVariant(db, BENCH_PRESS.id, draft({ name: 'Paused Bench Press', variantLabel: 'Paused', muscleGroup: 'back', mechanic: 'isolation', equipment: 'barbell' }));
    expect(result.ok).toBe(true);
    const v = result.ok ? getExercise(db, result.value) : undefined;
    expect(v).toMatchObject({ parentId: BENCH_PRESS.id, variantLabel: 'Paused', muscleGroup: 'chest', mechanic: 'compound' });
  });

  it('refuses a variant of a variant', () => {
    const result = createVariant(db, INCLINE_BENCH_PRESS.id, draft({ name: 'Incline Paused', variantLabel: 'Paused' }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/variant/) });
  });

  it('requires a label', () => {
    const result = createVariant(db, BENCH_PRESS.id, draft({ name: 'Wide Bench Press', variantLabel: '' }));
    expect(result).toMatchObject({ ok: false, fields: { variantLabel: expect.any(String) } });
  });

  it('fails cleanly if the parent is missing', () => {
    expect(createVariant(db, 'nope', draft({ variantLabel: 'X' }))).toMatchObject({ ok: false });
  });
});

describe('updateExercise', () => {
  it('cascades a parent’s new muscle group and mechanic to its variants', () => {
    const result = updateExercise(db, BENCH_PRESS.id, draft({ name: 'Bench Press', muscleGroup: 'triceps', mechanic: 'compound', equipment: 'barbell' }));
    expect(result.ok).toBe(true);
    for (const v of getVariants(db, BENCH_PRESS.id)) expect(v.muscleGroup).toBe('triceps');
  });

  it('keeps a variant on its parent’s muscle group and mechanic', () => {
    updateExercise(db, INCLINE_BENCH_PRESS.id, draft({ name: 'Incline Bench', variantLabel: 'Incline', muscleGroup: 'back', mechanic: 'isolation', equipment: 'barbell' }));
    expect(getExercise(db, INCLINE_BENCH_PRESS.id)).toMatchObject({ name: 'Incline Bench', muscleGroup: 'chest', mechanic: 'compound' });
  });

  it('allows keeping its own name in a different case', () => {
    const result = updateExercise(db, BENCH_PRESS.id, draft({ name: 'BENCH PRESS', muscleGroup: 'chest', mechanic: 'compound', equipment: 'barbell' }));
    expect(result.ok).toBe(true);
  });

  it('rejects renaming to another exercise’s name', () => {
    const result = updateExercise(db, BENCH_PRESS.id, draft({ name: 'lat pulldown', muscleGroup: 'chest', mechanic: 'compound', equipment: 'barbell' }));
    expect(result).toMatchObject({ ok: false, fields: { name: expect.any(String) } });
  });

  it('locks equipment once the exercise has been logged, but allows other edits', () => {
    logWorkoutWith(db, LAT_PULLDOWN.id);
    const base = { name: 'Lat Pulldown', muscleGroup: 'back', mechanic: 'compound' } as const;
    expect(updateExercise(db, LAT_PULLDOWN.id, draft({ ...base, equipment: 'machine' }))).toMatchObject({
      ok: false,
      fields: { equipment: expect.any(String) },
    });
    expect(updateExercise(db, LAT_PULLDOWN.id, draft({ ...base, name: 'Wide Lat Pulldown', equipment: 'cable' })).ok).toBe(true);
  });
});

describe('setArchived', () => {
  it('archiving a parent archives its variants; restoring a variant restores its parent', () => {
    setArchived(db, BENCH_PRESS.id, true);
    expect(getExercise(db, BENCH_PRESS.id)?.archivedAt).not.toBeNull();
    for (const v of getVariants(db, BENCH_PRESS.id)) expect(v.archivedAt).not.toBeNull();

    setArchived(db, INCLINE_BENCH_PRESS.id, false);
    expect(getExercise(db, INCLINE_BENCH_PRESS.id)?.archivedAt).toBeNull();
    expect(getExercise(db, BENCH_PRESS.id)?.archivedAt).toBeNull();
  });

  it('a variant created under an archived parent starts archived', () => {
    setArchived(db, BENCH_PRESS.id, true);
    const result = createVariant(db, BENCH_PRESS.id, draft({ name: 'Wide Bench Press', variantLabel: 'Wide', equipment: 'barbell' }));
    expect(result.ok && getExercise(db, result.value)?.archivedAt).not.toBeNull();
  });
});

describe('getUsage and deleteExercise', () => {
  it('counts workouts, split days and variants', () => {
    logWorkoutWith(db, BENCH_PRESS.id, 1);
    logWorkoutWith(db, BENCH_PRESS.id, 2);
    db.insert(splits).values({ id: 's', name: 'PPL' }).run();
    db.insert(splitDays).values({ id: 'd', splitId: 's', name: 'Push A', orderIndex: 0 }).run();
    db.insert(splitDayExercises).values({ id: 'sde', splitDayId: 'd', exerciseId: BENCH_PRESS.id, orderIndex: 0 }).run();
    expect(getUsage(db, BENCH_PRESS.id)).toEqual({ workoutCount: 2, splitDayCount: 1, variantCount: 2 });
  });

  it('deletes an unused exercise', () => {
    const created = createExercise(db, draft());
    expect(created.ok && deleteExercise(db, created.value).ok).toBe(true);
    expect(catalogueQuery(db).all()).toHaveLength(32);
  });

  it('refuses to delete an exercise with history, and leaves it in place', () => {
    logWorkoutWith(db, LAT_PULLDOWN.id);
    expect(deleteExercise(db, LAT_PULLDOWN.id)).toMatchObject({ ok: false, error: expect.stringMatching(/1 workout/) });
    expect(getExercise(db, LAT_PULLDOWN.id)).toBeDefined();
  });

  it('refuses to delete a parent that has variants', () => {
    expect(deleteExercise(db, BENCH_PRESS.id)).toMatchObject({ ok: false, error: expect.stringMatching(/variants/) });
  });

  it('can delete a variant, after which the parent can be deleted', () => {
    for (const v of getVariants(db, BENCH_PRESS.id)) expect(deleteExercise(db, v.id).ok).toBe(true);
    expect(deleteExercise(db, BENCH_PRESS.id).ok).toBe(true);
  });
});

describe('the database itself still guards against mistakes', () => {
  it('foreign keys are enforced in the test database, as on the phone', () => {
    logWorkoutWith(db, LAT_PULLDOWN.id);
    expect(() => db.delete(exercises).where(eq(exercises.id, LAT_PULLDOWN.id)).run()).toThrow(/constraint/i);
    expect(db.get<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`)?.foreign_keys).toBe(1);
  });
});
