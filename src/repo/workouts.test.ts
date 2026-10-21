import { eq } from 'drizzle-orm';

import { sets, workoutExercises, workouts } from '@/db/schema';
import { BACK_SQUAT, BENCH_PRESS, DUMBBELL_CURL } from '@/db/seed-data';
import type { AppDb } from '@/db/types';
import type { SetDraft } from '@/domain/set-input';
import { createTestDb } from '@/test-utils/test-db';

import { deleteExercise } from './exercises';
import { addSet, deleteSet, updateSet } from './sets';
import {
  addExerciseToWorkout,
  getWorkoutExercise,
  listWorkoutExercises,
  removeExerciseFromWorkout,
  setExerciseNotes,
  setNextTimePlan,
} from './workout-exercises';
import { discardWorkout, getActiveWorkout, getWorkoutSummary, startWorkout } from './workouts';

jest.mock('@/db/ids', () => ({
  newId: () => jest.requireActual<typeof import('crypto')>('crypto').randomUUID(),
}));

const set = (weight: string, reps: string, extra: Partial<SetDraft> = {}): SetDraft => ({
  weight,
  reps,
  rpe: null,
  setType: 'working',
  ...extra,
});

// Unwraps a successful Result, failing the test with its message otherwise.
function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`Expected success, got: ${result.error}`);
  return result.value;
}

let db: AppDb;
beforeEach(async () => {
  db = await createTestDb({ seed: true });
});

describe('workouts', () => {
  it('starts a workout that is then the active one', () => {
    const id = value(startWorkout(db));
    expect(getActiveWorkout(db)).toMatchObject({ id, endedAt: null });
  });

  it('refuses to start a second workout while one is in progress', () => {
    startWorkout(db);
    expect(startWorkout(db)).toMatchObject({ ok: false, error: expect.stringMatching(/already in progress/) });
  });

  it('allows a new workout once the previous one has ended', () => {
    const first = value(startWorkout(db));
    db.update(workouts).set({ endedAt: 2_000_000_000 }).where(eq(workouts.id, first)).run();
    expect(startWorkout(db).ok).toBe(true);
  });

  it('discarding deletes the workout with its exercises and sets', () => {
    const id = value(startWorkout(db));
    const we = value(addExerciseToWorkout(db, id, BENCH_PRESS.id));
    value(addSet(db, we, set('60', '8')));
    expect(discardWorkout(db, id).ok).toBe(true);
    expect(getActiveWorkout(db)).toBeUndefined();
    expect(db.select().from(workoutExercises).all()).toHaveLength(0);
    expect(db.select().from(sets).all()).toHaveLength(0);
  });

  it('refuses to discard a finished workout', () => {
    const id = value(startWorkout(db));
    db.update(workouts).set({ endedAt: 2_000_000_000 }).where(eq(workouts.id, id)).run();
    expect(discardWorkout(db, id)).toMatchObject({ ok: false });
  });

  it('summarises exercises and sets', () => {
    const id = value(startWorkout(db));
    const a = value(addExerciseToWorkout(db, id, BENCH_PRESS.id));
    value(addExerciseToWorkout(db, id, BACK_SQUAT.id));
    value(addSet(db, a, set('60', '8')));
    value(addSet(db, a, set('60', '7')));
    expect(getWorkoutSummary(db, id)).toEqual({ exerciseCount: 2, setCount: 2 });
  });
});

describe('workout exercises', () => {
  it('keeps exercises in the order they were added, each with its own sets in order', () => {
    const id = value(startWorkout(db));
    const bench = value(addExerciseToWorkout(db, id, BENCH_PRESS.id));
    const squat = value(addExerciseToWorkout(db, id, BACK_SQUAT.id));
    value(addSet(db, squat, set('100', '5')));
    value(addSet(db, bench, set('60', '8')));
    value(addSet(db, bench, set('62.5', '6')));

    const list = listWorkoutExercises(db, id);
    expect(list.map((x) => x.exercise.name)).toEqual(['Bench Press', 'Back Squat']);
    expect(list[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 8],
      [62.5, 6],
    ]);
    expect(list[1].sets).toHaveLength(1);
  });

  it('refuses unknown workouts or exercises', () => {
    const id = value(startWorkout(db));
    expect(addExerciseToWorkout(db, 'nope', BENCH_PRESS.id).ok).toBe(false);
    expect(addExerciseToWorkout(db, id, 'nope').ok).toBe(false);
  });

  it('removing an exercise removes its sets too', () => {
    const id = value(startWorkout(db));
    const we = value(addExerciseToWorkout(db, id, BENCH_PRESS.id));
    value(addSet(db, we, set('60', '8')));
    removeExerciseFromWorkout(db, we);
    expect(listWorkoutExercises(db, id)).toEqual([]);
    expect(db.select().from(sets).all()).toHaveLength(0);
  });

  it('saves trimmed notes and clears blank ones', () => {
    const id = value(startWorkout(db));
    const we = value(addExerciseToWorkout(db, id, BENCH_PRESS.id));
    setExerciseNotes(db, we, '  seat at 4  ');
    expect(getWorkoutExercise(db, we)?.workoutExercise.notes).toBe('seat at 4');
    setExerciseNotes(db, we, '   ');
    expect(getWorkoutExercise(db, we)?.workoutExercise.notes).toBeNull();
    expect(setExerciseNotes(db, we, 'x'.repeat(501)).ok).toBe(false);
  });

  it('stores the next-time plan, each flag independently', () => {
    const id = value(startWorkout(db));
    const we = value(addExerciseToWorkout(db, id, DUMBBELL_CURL.id));
    setNextTimePlan(db, we, { increaseWeight: true });
    setNextTimePlan(db, we, { increaseReps: true });
    setNextTimePlan(db, we, { increaseWeight: false });
    expect(getWorkoutExercise(db, we)?.workoutExercise).toMatchObject({ nextIncreaseWeight: false, nextIncreaseReps: true });
  });

  it('an exercise used in the active workout can’t be deleted from the catalogue', () => {
    const id = value(startWorkout(db));
    value(addExerciseToWorkout(db, id, DUMBBELL_CURL.id));
    expect(deleteExercise(db, DUMBBELL_CURL.id)).toMatchObject({ ok: false, error: expect.stringMatching(/1 workout/) });
  });
});

describe('sets', () => {
  let we: string;
  beforeEach(() => {
    const id = value(startWorkout(db));
    we = value(addExerciseToWorkout(db, id, BENCH_PRESS.id));
  });

  it('stores weight, reps, RPE and type exactly as entered', () => {
    const id = value(addSet(db, we, set('62.5', '6', { rpe: 8.5, setType: 'failure' })));
    expect(getWorkoutExercise(db, we)?.sets[0]).toMatchObject({ id, weightKg: 62.5, reps: 6, rpe: 8.5, setType: 'failure' });
  });

  it('returns field errors and writes nothing for invalid input', () => {
    expect(addSet(db, we, set('', '0'))).toMatchObject({ ok: false, fields: { weight: expect.any(String), reps: expect.any(String) } });
    expect(getWorkoutExercise(db, we)?.sets).toHaveLength(0);
  });

  it('keeps order after deleting a middle set and adding another', () => {
    value(addSet(db, we, set('60', '8')));
    const middle = value(addSet(db, we, set('60', '7')));
    value(addSet(db, we, set('60', '6')));
    deleteSet(db, middle);
    value(addSet(db, we, set('50', '10')));
    expect(getWorkoutExercise(db, we)?.sets.map((s) => s.reps)).toEqual([8, 6, 10]);
  });

  it('updates a set in place', () => {
    const id = value(addSet(db, we, set('60', '8')));
    expect(updateSet(db, id, set('65', '5', { setType: 'dropset' })).ok).toBe(true);
    expect(getWorkoutExercise(db, we)?.sets[0]).toMatchObject({ weightKg: 65, reps: 5, setType: 'dropset' });
    expect(updateSet(db, 'nope', set('1', '1')).ok).toBe(false);
  });

  it('refuses a set for an exercise no longer in the workout', () => {
    removeExerciseFromWorkout(db, we);
    expect(addSet(db, we, set('60', '8')).ok).toBe(false);
  });
});
