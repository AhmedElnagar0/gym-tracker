import { and, count, eq, inArray, isNull } from 'drizzle-orm';

import { newId } from '@/db/ids';
import { sets, workoutExercises, workouts, type Workout } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { nowUnix } from '@/domain/time';

import { done, fail, ok, type Result } from './result';

// A workout's life: started (ended_at NULL) → finished (M4) or discarded.
// Everything is written the moment it happens, so a force-quit loses nothing.

/** The in-progress workout, if any. The database allows at most one. */
export function getActiveWorkout(db: AppDb): Workout | undefined {
  return db.select().from(workouts).where(isNull(workouts.endedAt)).get();
}

export function getWorkout(db: AppDb, id: string): Workout | undefined {
  return db.select().from(workouts).where(eq(workouts.id, id)).get();
}

export function startWorkout(db: AppDb): Result<string> {
  if (getActiveWorkout(db)) return fail('A workout is already in progress. Resume it instead.');
  const id = newId();
  db.insert(workouts).values({ id, startedAt: nowUnix() }).run();
  return ok(id);
}

/** Deletes an in-progress workout and everything logged in it. */
export function discardWorkout(db: AppDb, id: string): Result {
  const workout = getWorkout(db, id);
  if (!workout) return fail('This workout no longer exists.');
  if (workout.endedAt !== null) return fail('Only a workout in progress can be discarded.');
  // ON DELETE CASCADE removes its workout_exercises and their sets.
  db.delete(workouts).where(and(eq(workouts.id, id), isNull(workouts.endedAt))).run();
  return done();
}

/** Each exercise in the workout with how many sets it has (0 included). */
function setCountsByExercise(db: AppDb, workoutId: string): { id: string; setCount: number }[] {
  return db
    .select({ id: workoutExercises.id, setCount: count(sets.id) })
    .from(workoutExercises)
    .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .groupBy(workoutExercises.id)
    .all();
}

/**
 * Finishes the workout in progress: exercises with no sets are dropped, then it gets its
 * end time. A workout with no sets at all can't be finished (discard it instead).
 */
export function finishWorkout(db: AppDb, id: string): Result<{ removedEmpty: number }> {
  const workout = getWorkout(db, id);
  if (!workout) return fail('This workout no longer exists.');
  if (workout.endedAt !== null) return fail('This workout is already finished.');

  const perExercise = setCountsByExercise(db, id);
  const emptyIds = perExercise.filter((e) => e.setCount === 0).map((e) => e.id);
  if (perExercise.length === emptyIds.length) {
    return fail('No sets are logged, so there is nothing to save. Discard the workout instead.');
  }

  db.transaction((tx) => {
    if (emptyIds.length > 0) tx.delete(workoutExercises).where(inArray(workoutExercises.id, emptyIds)).run();
    // max(): the end time can never be before the start (a CHECK constraint), even if
    // the phone's clock was changed mid-workout.
    tx.update(workouts)
      .set({ endedAt: Math.max(nowUnix(), workout.startedAt) })
      .where(eq(workouts.id, id))
      .run();
  });
  return ok({ removedEmpty: emptyIds.length });
}

/** Permanently deletes a finished workout and everything logged in it. */
export function deleteWorkout(db: AppDb, id: string): Result {
  const workout = getWorkout(db, id);
  if (!workout) return fail('This workout no longer exists.');
  if (workout.endedAt === null) return fail('This workout is still in progress. Discard it instead.');
  // ON DELETE CASCADE removes its workout_exercises and their sets.
  db.delete(workouts).where(eq(workouts.id, id)).run();
  return done();
}

/**
 * Drops exercises with no sets from a workout, e.g. after editing a past workout.
 * Returns how many sets the workout still has.
 */
export function removeEmptyExercises(db: AppDb, id: string): { removed: number; setCount: number } {
  const perExercise = setCountsByExercise(db, id);
  const emptyIds = perExercise.filter((e) => e.setCount === 0).map((e) => e.id);
  if (emptyIds.length > 0) db.delete(workoutExercises).where(inArray(workoutExercises.id, emptyIds)).run();
  return { removed: emptyIds.length, setCount: perExercise.reduce((n, e) => n + e.setCount, 0) };
}

export type WorkoutSummary = { exerciseCount: number; setCount: number };

export function getWorkoutSummary(db: AppDb, id: string): WorkoutSummary {
  const exercises = db
    .select({ n: count() })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, id))
    .get();
  const logged = db
    .select({ n: count() })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, id))
    .get();
  return { exerciseCount: exercises?.n ?? 0, setCount: logged?.n ?? 0 };
}
