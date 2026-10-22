import { and, asc, desc, eq, isNotNull, lt, ne } from 'drizzle-orm';

import { sets, workoutExercises, workouts, type Workout } from '@/db/schema';
import type { AppDb } from '@/db/types';

import type { LoggedSet, WorkoutExercise } from './workout-exercises';

// Looking back at previous sessions.

export type LastPerformance = { workout: Workout; workoutExercise: WorkoutExercise; sets: LoggedSet[] };

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
