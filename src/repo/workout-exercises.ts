import { asc, eq, inArray, max } from 'drizzle-orm';

import { newId } from '@/db/ids';
import { exercises, sets, workoutExercises, type Exercise } from '@/db/schema';
import type { AppDb } from '@/db/types';

import { done, fail, ok, type Result } from './result';
import { getWorkout } from './workouts';

// The exercises inside one workout, in order, each with its sets.

export type LoggedSet = typeof sets.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutExerciseDetail = { workoutExercise: WorkoutExercise; exercise: Exercise; sets: LoggedSet[] };

export const NOTES_MAX_LENGTH = 500;

/** Every exercise in the workout (in order) with its sets (in order). */
export function listWorkoutExercises(db: AppDb, workoutId: string): WorkoutExerciseDetail[] {
  const rows = db
    .select({ workoutExercise: workoutExercises, exercise: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.orderIndex))
    .all();
  if (rows.length === 0) return [];

  const allSets = db
    .select()
    .from(sets)
    .where(
      inArray(
        sets.workoutExerciseId,
        rows.map((r) => r.workoutExercise.id),
      ),
    )
    .orderBy(asc(sets.setIndex))
    .all();
  return rows.map((r) => ({ ...r, sets: allSets.filter((s) => s.workoutExerciseId === r.workoutExercise.id) }));
}

export function getWorkoutExercise(db: AppDb, workoutExerciseId: string): WorkoutExerciseDetail | undefined {
  const row = db
    .select({ workoutExercise: workoutExercises, exercise: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.id, workoutExerciseId))
    .get();
  if (!row) return undefined;
  const logged = db
    .select()
    .from(sets)
    .where(eq(sets.workoutExerciseId, workoutExerciseId))
    .orderBy(asc(sets.setIndex))
    .all();
  return { ...row, sets: logged };
}

/** Appends an exercise to the end of the workout. Returns the new workout-exercise id. */
export function addExerciseToWorkout(db: AppDb, workoutId: string, exerciseId: string): Result<string> {
  if (!getWorkout(db, workoutId)) return fail('This workout no longer exists.');
  const exercise = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.id, exerciseId)).get();
  if (!exercise) return fail('That exercise no longer exists.');

  const last = db
    .select({ n: max(workoutExercises.orderIndex) })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .get();
  const id = newId();
  db.insert(workoutExercises)
    .values({ id, workoutId, exerciseId, orderIndex: (last?.n ?? -1) + 1 })
    .run();
  return ok(id);
}

/** Removes an exercise (and its sets) from a workout. */
export function removeExerciseFromWorkout(db: AppDb, workoutExerciseId: string): Result {
  db.delete(workoutExercises).where(eq(workoutExercises.id, workoutExerciseId)).run();
  return done();
}

/** Saves the note for this exercise in this session. Blank clears it. */
export function setExerciseNotes(db: AppDb, workoutExerciseId: string, notes: string): Result {
  const trimmed = notes.trim();
  if (trimmed.length > NOTES_MAX_LENGTH) return fail(`Keep notes under ${NOTES_MAX_LENGTH} characters.`);
  db.update(workoutExercises)
    .set({ notes: trimmed === '' ? null : trimmed })
    .where(eq(workoutExercises.id, workoutExerciseId))
    .run();
  return done();
}

/** "Next time: increase weight / reps", shown when this exercise is done again (M4). */
export function setNextTimePlan(
  db: AppDb,
  workoutExerciseId: string,
  plan: { increaseWeight?: boolean; increaseReps?: boolean },
): Result {
  const changes: Partial<WorkoutExercise> = {};
  if (plan.increaseWeight !== undefined) changes.nextIncreaseWeight = plan.increaseWeight;
  if (plan.increaseReps !== undefined) changes.nextIncreaseReps = plan.increaseReps;
  if (Object.keys(changes).length === 0) return done();
  db.update(workoutExercises).set(changes).where(eq(workoutExercises.id, workoutExerciseId)).run();
  return done();
}
