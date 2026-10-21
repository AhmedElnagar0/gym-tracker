import { eq, max } from 'drizzle-orm';

import { newId } from '@/db/ids';
import { sets, workoutExercises } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { type SetDraft, type SetErrors, validateSet } from '@/domain/set-input';

import { done, fail, ok, type Result } from './result';

const invalid = (errors: SetErrors) => fail('Please fix the highlighted fields.', errors);

/** Logs a new set after the existing ones. Returns its id. */
export function addSet(db: AppDb, workoutExerciseId: string, draft: SetDraft): Result<string, SetErrors> {
  const v = validateSet(draft);
  if (!v.ok) return invalid(v.errors);
  const parent = db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .where(eq(workoutExercises.id, workoutExerciseId))
    .get();
  if (!parent) return fail('This exercise is no longer in the workout.');

  // set_index only orders sets; the numbers shown come from position, so gaps
  // left by deleted sets don't matter.
  const last = db
    .select({ n: max(sets.setIndex) })
    .from(sets)
    .where(eq(sets.workoutExerciseId, workoutExerciseId))
    .get();
  const id = newId();
  db.insert(sets)
    .values({ id, workoutExerciseId, setIndex: (last?.n ?? -1) + 1, ...v.value })
    .run();
  return ok(id);
}

export function updateSet(db: AppDb, setId: string, draft: SetDraft): Result<void, SetErrors> {
  const v = validateSet(draft);
  if (!v.ok) return invalid(v.errors);
  const existing = db.select({ id: sets.id }).from(sets).where(eq(sets.id, setId)).get();
  if (!existing) return fail('This set no longer exists.');
  db.update(sets).set(v.value).where(eq(sets.id, setId)).run();
  return done();
}

export function deleteSet(db: AppDb, setId: string): Result {
  db.delete(sets).where(eq(sets.id, setId)).run();
  return done();
}
