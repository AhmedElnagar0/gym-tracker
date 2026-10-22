import { randomUUID } from 'crypto';

import { sets, workoutExercises, workouts } from '@/db/schema';
import { BENCH_PRESS, INCLINE_BENCH_PRESS } from '@/db/seed-data';
import type { AppDb } from '@/db/types';
import { createTestDb } from '@/test-utils/test-db';

import { getExerciseHistory, getLastPerformance, listFinishedWorkouts } from './history';

type Logged = { weightKg: number; reps: number };

// Inserts a workout at a given start time with one exercise and its sets.
function logWorkout(
  db: AppDb,
  startedAt: number,
  exerciseId: string,
  logged: Logged[],
  options: { finished?: boolean; notes?: string; increaseWeight?: boolean } = {},
) {
  const workoutId = randomUUID();
  const weId = randomUUID();
  db.insert(workouts)
    .values({ id: workoutId, startedAt, endedAt: options.finished === false ? null : startedAt + 3600 })
    .run();
  db.insert(workoutExercises)
    .values({
      id: weId,
      workoutId,
      exerciseId,
      orderIndex: 0,
      notes: options.notes ?? null,
      nextIncreaseWeight: options.increaseWeight ?? false,
    })
    .run();
  logged.forEach((s, i) => db.insert(sets).values({ id: randomUUID(), workoutExerciseId: weId, setIndex: i, ...s }).run());
  return { workoutId, startedAt };
}

let db: AppDb;
beforeEach(async () => {
  db = await createTestDb({ seed: true });
});

describe('listFinishedWorkouts', () => {
  it('lists finished workouts newest first with exercise names and set counts', () => {
    logWorkout(db, 1000, BENCH_PRESS.id, [{ weightKg: 50, reps: 10 }]);
    logWorkout(db, 3000, INCLINE_BENCH_PRESS.id, [{ weightKg: 40, reps: 10 }, { weightKg: 40, reps: 9 }]);
    logWorkout(db, 4000, BENCH_PRESS.id, [{ weightKg: 60, reps: 8 }], { finished: false }); // in progress

    const list = listFinishedWorkouts(db);
    expect(list.map((w) => [w.workout.startedAt, w.exerciseNames, w.setCount])).toEqual([
      [3000, ['Incline Bench Press'], 2],
      [1000, ['Bench Press'], 1],
    ]);
  });

  it('is empty before anything is finished', () => {
    expect(listFinishedWorkouts(db)).toEqual([]);
  });
});

describe('getExerciseHistory', () => {
  it('returns every finished session of that exercise, newest first, with sets and notes', () => {
    logWorkout(db, 1000, BENCH_PRESS.id, [{ weightKg: 50, reps: 10 }], { notes: 'first' });
    logWorkout(db, 2000, INCLINE_BENCH_PRESS.id, [{ weightKg: 40, reps: 10 }]); // a variant: not included
    logWorkout(db, 3000, BENCH_PRESS.id, [{ weightKg: 60, reps: 8 }, { weightKg: 62.5, reps: 6 }]);
    logWorkout(db, 4000, BENCH_PRESS.id, [{ weightKg: 99, reps: 1 }], { finished: false }); // in progress

    const history = getExerciseHistory(db, BENCH_PRESS.id);
    expect(history.map((h) => h.workout.startedAt)).toEqual([3000, 1000]);
    expect(history[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 8],
      [62.5, 6],
    ]);
    expect(history[1].workoutExercise.notes).toBe('first');
  });

  it('is empty for an exercise never done', () => {
    expect(getExerciseHistory(db, BENCH_PRESS.id)).toEqual([]);
  });
});

describe('getLastPerformance', () => {
  it('returns the most recent earlier finished workout with that exercise, its note, plan and sets in order', () => {
    logWorkout(db, 1000, BENCH_PRESS.id, [{ weightKg: 50, reps: 10 }]);
    logWorkout(db, 2000, BENCH_PRESS.id, [{ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 7 }], {
      notes: 'seat at 4',
      increaseWeight: true,
    });
    const current = logWorkout(db, 3000, BENCH_PRESS.id, [], { finished: false });

    const last = getLastPerformance(db, BENCH_PRESS.id, current);
    expect(last?.workout.startedAt).toBe(2000);
    expect(last?.workoutExercise).toMatchObject({ notes: 'seat at 4', nextIncreaseWeight: true });
    expect(last?.sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 8],
      [60, 7],
    ]);
  });

  it('ignores the current workout, unfinished workouts and later workouts', () => {
    logWorkout(db, 1000, BENCH_PRESS.id, [{ weightKg: 50, reps: 10 }]);
    const editing = logWorkout(db, 2000, BENCH_PRESS.id, [{ weightKg: 55, reps: 9 }]);
    logWorkout(db, 3000, BENCH_PRESS.id, [{ weightKg: 70, reps: 5 }]); // later: not "before"
    logWorkout(db, 1500, BENCH_PRESS.id, [{ weightKg: 99, reps: 1 }], { finished: false }); // abandoned
    expect(getLastPerformance(db, BENCH_PRESS.id, editing)?.workout.startedAt).toBe(1000);
  });

  it('treats a variant as a different exercise', () => {
    logWorkout(db, 1000, INCLINE_BENCH_PRESS.id, [{ weightKg: 40, reps: 10 }]);
    const current = logWorkout(db, 2000, BENCH_PRESS.id, [], { finished: false });
    expect(getLastPerformance(db, BENCH_PRESS.id, current)).toBeUndefined();
    expect(getLastPerformance(db, INCLINE_BENCH_PRESS.id, current)?.sets).toHaveLength(1);
  });

  it('returns nothing the first time an exercise is done', () => {
    const current = logWorkout(db, 2000, BENCH_PRESS.id, [], { finished: false });
    expect(getLastPerformance(db, BENCH_PRESS.id, current)).toBeUndefined();
  });
});
