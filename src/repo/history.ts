import { and, asc, count, desc, eq, inArray, isNotNull, lt, ne } from 'drizzle-orm';

import { exercises, sets, workoutExercises, workouts, type Workout } from '@/db/schema';
import type { AppDb } from '@/db/types';

import type { LoggedSet, WorkoutExercise } from './workout-exercises';

// Looking back at previous sessions.

export type LastPerformance = { workout: Workout; workoutExercise: WorkoutExercise; sets: LoggedSet[] };

export type WorkoutListItem = { workout: Workout; exerciseNames: string[]; setCount: number };

/** Finished workouts, newest first, with their exercise names (in order) and set counts. */
export function listFinishedWorkouts(db: AppDb): WorkoutListItem[] {
  const finished = db.select().from(workouts).where(isNotNull(workouts.endedAt)).orderBy(desc(workouts.startedAt)).all();
  if (finished.length === 0) return [];
  const ids = finished.map((w) => w.id);

  const names = db
    .select({ workoutId: workoutExercises.workoutId, name: exercises.name })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(inArray(workoutExercises.workoutId, ids))
    .orderBy(asc(workoutExercises.orderIndex))
    .all();
  const setCounts = db
    .select({ workoutId: workoutExercises.workoutId, n: count(sets.id) })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(inArray(workoutExercises.workoutId, ids))
    .groupBy(workoutExercises.workoutId)
    .all();

  return finished.map((workout) => ({
    workout,
    exerciseNames: names.filter((n) => n.workoutId === workout.id).map((n) => n.name),
    setCount: setCounts.find((s) => s.workoutId === workout.id)?.n ?? 0,
  }));
}

/** Every finished session of one exercise, newest first, with its note and sets. */
export function getExerciseHistory(db: AppDb, exerciseId: string): LastPerformance[] {
  const rows = db
    .select({ workout: workouts, workoutExercise: workoutExercises })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), isNotNull(workouts.endedAt)))
    .orderBy(desc(workouts.startedAt), asc(workoutExercises.orderIndex))
    .all();
  if (rows.length === 0) return [];

  const logged = db
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
  return rows.map((r) => ({ ...r, sets: logged.filter((s) => s.workoutExerciseId === r.workoutExercise.id) }));
}

/**
 * The most recent *finished* workout before `before` that included this exact exercise
 * (variants count as separate exercises), with its note, next-time plan and sets.
 * If that workout had the exercise twice, the first occurrence is used.
 */
export function getLastPerformance(
  db: AppDb,
  exerciseId: string,
  before: { workoutId: string; startedAt: number },
): LastPerformance | undefined {
  const row = db
    .select({ workout: workouts, workoutExercise: workoutExercises })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        isNotNull(workouts.endedAt),
        ne(workouts.id, before.workoutId),
        lt(workouts.startedAt, before.startedAt),
      ),
    )
    .orderBy(desc(workouts.startedAt), asc(workoutExercises.orderIndex))
    .get();
  if (!row) return undefined;

  const logged = db
    .select()
    .from(sets)
    .where(eq(sets.workoutExerciseId, row.workoutExercise.id))
    .orderBy(asc(sets.setIndex))
    .all();
  return { ...row, sets: logged };
}
