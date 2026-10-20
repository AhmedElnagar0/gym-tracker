import { and, asc, countDistinct, eq, isNull, ne, sql } from 'drizzle-orm';

import { newId } from '@/db/ids';
import { exercises, splitDayExercises, workoutExercises, type Exercise } from '@/db/schema';
import type { AppDb } from '@/db/types';
import { canChangeEquipment, deleteBlocker, type ExerciseUsage } from '@/domain/exercise-rules';
import { nowUnix } from '@/domain/time';
import { type DraftErrors, type ExerciseDraft, validateExerciseDraft } from '@/domain/validation';

// Every read and write of exercises. Screens call these; they never build SQL themselves.
// Writes return a Result instead of throwing, so screens can show the message.

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string; fields?: DraftErrors };

const fail = (error: string, fields?: DraftErrors): { ok: false; error: string; fields?: DraftErrors } => ({
  ok: false,
  error,
  fields,
});

/** The query the catalogue screen watches with useLiveQuery. */
export function catalogueQuery(db: AppDb) {
  return db.select().from(exercises).orderBy(asc(exercises.name));
}

export function getExercise(db: AppDb, id: string): Exercise | undefined {
  return db.select().from(exercises).where(eq(exercises.id, id)).get();
}

export function getVariants(db: AppDb, parentId: string): Exercise[] {
  return db.select().from(exercises).where(eq(exercises.parentId, parentId)).orderBy(asc(exercises.name)).all();
}

export function getUsage(db: AppDb, id: string): ExerciseUsage {
  const workouts = db
    .select({ n: countDistinct(workoutExercises.workoutId) })
    .from(workoutExercises)
    .where(eq(workoutExercises.exerciseId, id))
    .get();
  const splitDays = db
    .select({ n: countDistinct(splitDayExercises.splitDayId) })
    .from(splitDayExercises)
    .where(eq(splitDayExercises.exerciseId, id))
    .get();
  const variants = db
    .select({ n: sql<number>`count(*)` })
    .from(exercises)
    .where(eq(exercises.parentId, id))
    .get();
  return { workoutCount: workouts?.n ?? 0, splitDayCount: splitDays?.n ?? 0, variantCount: variants?.n ?? 0 };
}

/** True if another exercise already has this name, ignoring case. */
function nameTaken(db: AppDb, name: string, exceptId?: string): boolean {
  const sameName = sql`lower(${exercises.name}) = lower(${name})`;
  const row = db
    .select({ id: exercises.id })
    .from(exercises)
    .where(exceptId ? and(sameName, ne(exercises.id, exceptId)) : sameName)
    .get();
  return row !== undefined;
}

const nameTakenError = (name: string) => fail(`"${name}" already exists.`, { name: 'That name is already used.' });

/** Creates a top-level exercise. Returns its new id. */
export function createExercise(db: AppDb, draft: ExerciseDraft): Result<string> {
  const v = validateExerciseDraft(draft, { isVariant: false });
  if (!v.ok) return fail('Please fix the highlighted fields.', v.errors);
  if (nameTaken(db, v.value.name)) return nameTakenError(v.value.name);

  const id = newId();
  db.insert(exercises)
    .values({ id, parentId: null, ...v.value })
    .run();
  return { ok: true, value: id };
}

/**
 * Creates a variant of `parentId`. The variant takes the parent's muscle group and
 * mechanic (so it always sits under its parent); the draft's values for those are ignored.
 */
export function createVariant(db: AppDb, parentId: string, draft: ExerciseDraft): Result<string> {
  const parent = getExercise(db, parentId);
  if (!parent) return fail('The parent exercise no longer exists.');
  if (parent.parentId !== null) return fail("A variant can't have variants of its own.");

  const v = validateExerciseDraft(
    { ...draft, muscleGroup: parent.muscleGroup, mechanic: parent.mechanic },
    { isVariant: true },
  );
  if (!v.ok) return fail('Please fix the highlighted fields.', v.errors);
  if (nameTaken(db, v.value.name)) return nameTakenError(v.value.name);

  const id = newId();
  db.insert(exercises)
    .values({ id, parentId, ...v.value, archivedAt: parent.archivedAt === null ? null : nowUnix() })
    .run();
  return { ok: true, value: id };
}

/**
 * Updates an exercise. For a parent, a new muscle group / mechanic is copied to its
 * variants in the same transaction. For a variant, those stay its parent's.
 * Equipment can't change once the exercise has been logged.
 */
export function updateExercise(db: AppDb, id: string, draft: ExerciseDraft): Result {
  const current = getExercise(db, id);
  if (!current) return fail('This exercise no longer exists.');

  const isVariant = current.parentId !== null;
  let effective = draft;
  if (isVariant) {
    const parent = getExercise(db, current.parentId!);
    if (!parent) return fail('The parent exercise no longer exists.');
    effective = { ...draft, muscleGroup: parent.muscleGroup, mechanic: parent.mechanic };
  }

  const v = validateExerciseDraft(effective, { isVariant });
  if (!v.ok) return fail('Please fix the highlighted fields.', v.errors);
  if (nameTaken(db, v.value.name, id)) return nameTakenError(v.value.name);
  if (v.value.equipment !== current.equipment && !canChangeEquipment(getUsage(db, id))) {
    return fail("Equipment can't change after the exercise has been logged: old weights would change meaning.", {
      equipment: 'Locked: this exercise has history.',
    });
  }

  db.transaction((tx) => {
    tx.update(exercises).set(v.value).where(eq(exercises.id, id)).run();
    if (!isVariant) {
      tx.update(exercises)
        .set({ muscleGroup: v.value.muscleGroup, mechanic: v.value.mechanic })
        .where(eq(exercises.parentId, id))
        .run();
    }
  });
  return { ok: true, value: undefined };
}

/**
 * Archiving hides an exercise from the catalogue and pickers but keeps its history.
 * Archiving a parent archives its variants too; restoring a variant restores its parent,
 * so a visible variant always has a visible parent.
 */
export function setArchived(db: AppDb, id: string, archived: boolean): Result {
  const current = getExercise(db, id);
  if (!current) return fail('This exercise no longer exists.');

  const now = nowUnix();
  db.transaction((tx) => {
    tx.update(exercises)
      .set({ archivedAt: archived ? now : null })
      .where(eq(exercises.id, id))
      .run();
    if (archived && current.parentId === null) {
      tx.update(exercises)
        .set({ archivedAt: now })
        .where(and(eq(exercises.parentId, id), isNull(exercises.archivedAt)))
        .run();
    }
    if (!archived && current.parentId !== null) {
      tx.update(exercises).set({ archivedAt: null }).where(eq(exercises.id, current.parentId)).run();
    }
  });
  return { ok: true, value: undefined };
}

/** Deletes an exercise that has never been used and has no variants. */
export function deleteExercise(db: AppDb, id: string): Result {
  if (!getExercise(db, id)) return fail('This exercise no longer exists.');
  const blocker = deleteBlocker(getUsage(db, id));
  if (blocker) return fail(blocker);
  db.delete(exercises).where(eq(exercises.id, id)).run();
  return { ok: true, value: undefined };
}
