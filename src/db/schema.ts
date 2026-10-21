// The ONLY place the database schema is defined.
// After changing this file: `npm run db:generate`, review the new drizzle/*.sql,
// then `npm run check:db`. Never edit generated migrations by hand.
//
// Rules SQLite can't express (enforced in src/repo/, unit-tested):
// - a variant's parent must not itself be a variant (one level deep)
// - variants inherit muscle_group and mechanic from their parent
// - an exercise's equipment is locked once it has logged sets
// - a split_schedule row must point at a day of the same split

import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import {
  EQUIPMENT,
  MECHANICS,
  MUSCLE_GROUPS,
  SCHEDULE_MODES,
  SET_TYPES,
} from '@/domain/constants';

// Builds the `'a', 'b', 'c'` part of a CHECK (col IN (...)) from a constant list.
// Safe to use sql.raw here: the values are compile-time constants, never user input.
function inList(values: readonly string[]) {
  return sql.raw(values.map((v) => `'${v}'`).join(', '));
}

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id').references((): AnySQLiteColumn => exercises.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    variantLabel: text('variant_label'),
    muscleGroup: text('muscle_group', { enum: MUSCLE_GROUPS }).notNull(),
    mechanic: text('mechanic', { enum: MECHANICS }).notNull(),
    equipment: text('equipment', { enum: EQUIPMENT }).notNull(),
    isUnilateral: integer('is_unilateral', { mode: 'boolean' }).notNull().default(false),
    // File name only (e.g. "3f2a….jpg"), relative to the app's photos/ folder.
    // Never an absolute path: iOS changes the app container path between installs.
    photoFile: text('photo_file'),
    archivedAt: integer('archived_at'),
  },
  (t) => [
    uniqueIndex('exercises_name_unique_ci').on(sql`lower("name")`),
    index('exercises_parent_idx').on(t.parentId),
    check('exercises_muscle_group_ck', sql`"muscle_group" IN (${inList(MUSCLE_GROUPS)})`),
    check('exercises_mechanic_ck', sql`"mechanic" IN (${inList(MECHANICS)})`),
    check('exercises_equipment_ck', sql`"equipment" IN (${inList(EQUIPMENT)})`),
    check('exercises_not_own_parent_ck', sql`"parent_id" IS NULL OR "parent_id" <> "id"`),
    check('exercises_name_not_blank_ck', sql`length(trim("name")) > 0`),
  ],
);

export const splits = sqliteTable(
  'splits',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    scheduleMode: text('schedule_mode', { enum: SCHEDULE_MODES }).notNull().default('rotation'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    // At most one active split: every active row has is_active = 1, so a unique
    // index over only the active rows allows a single one.
    uniqueIndex('splits_one_active').on(t.isActive).where(sql`"is_active" = 1`),
    check('splits_schedule_mode_ck', sql`"schedule_mode" IN (${inList(SCHEDULE_MODES)})`),
  ],
);

export const splitDays = sqliteTable(
  'split_days',
  {
    id: text('id').primaryKey(),
    splitId: text('split_id')
      .notNull()
      .references(() => splits.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    orderIndex: integer('order_index').notNull(),
  },
  (t) => [index('split_days_split_idx').on(t.splitId)],
);

export const splitSchedule = sqliteTable(
  'split_schedule',
  {
    splitId: text('split_id')
      .notNull()
      .references(() => splits.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(), // 0 = Monday … 6 = Sunday
    splitDayId: text('split_day_id')
      .notNull()
      .references(() => splitDays.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.splitId, t.weekday] }),
    index('split_schedule_day_idx').on(t.splitDayId),
    check('split_schedule_weekday_ck', sql`"weekday" BETWEEN 0 AND 6`),
  ],
);

export const splitDayExercises = sqliteTable(
  'split_day_exercises',
  {
    id: text('id').primaryKey(),
    splitDayId: text('split_day_id')
      .notNull()
      .references(() => splitDays.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    orderIndex: integer('order_index').notNull(),
    targetSets: integer('target_sets').notNull().default(3),
  },
  (t) => [
    index('split_day_exercises_day_idx').on(t.splitDayId),
    index('split_day_exercises_exercise_idx').on(t.exerciseId),
    check('split_day_exercises_target_sets_ck', sql`"target_sets" >= 1`),
  ],
);

export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'), // NULL = in progress
    notes: text('notes'),
    // SET NULL: deleting a split keeps the workouts that were done from it.
    splitDayId: text('split_day_id').references(() => splitDays.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('workouts_started_at_idx').on(t.startedAt),
    index('workouts_split_day_idx').on(t.splitDayId),
    // At most one in-progress workout. NULLs never collide in a unique index, so
    // index an expression that is 1 for every row the partial index covers.
    // (No commas in index expressions: drizzle-kit splits on them and emits broken SQL.)
    uniqueIndex('workouts_one_active').on(sql`("ended_at" IS NULL)`).where(sql`"ended_at" IS NULL`),
    check('workouts_end_after_start_ck', sql`"ended_at" IS NULL OR "ended_at" >= "started_at"`),
  ],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    orderIndex: integer('order_index').notNull(),
    supersetGroup: integer('superset_group'), // no UI yet, see LATER.md
    targetSets: integer('target_sets'), // copied from the split day, if any
    notes: text('notes'), // the user's note for this exercise in this session
    nextIncreaseWeight: integer('next_increase_weight', { mode: 'boolean' }).notNull().default(false),
    nextIncreaseReps: integer('next_increase_reps', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    index('workout_exercises_workout_idx').on(t.workoutId),
    index('workout_exercises_exercise_idx').on(t.exerciseId),
    check('workout_exercises_target_sets_ck', sql`"target_sets" IS NULL OR "target_sets" >= 1`),
  ],
);

export const sets = sqliteTable(
  'sets',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    setIndex: integer('set_index').notNull(),
    weightKg: real('weight_kg').notNull(), // meaning depends on equipment, see conventions.ts
    reps: integer('reps').notNull(),
    rpe: real('rpe'),
    setType: text('set_type', { enum: SET_TYPES }).notNull().default('working'),
  },
  (t) => [
    index('sets_workout_exercise_idx').on(t.workoutExerciseId),
    check('sets_weight_ck', sql`"weight_kg" >= 0`),
    check('sets_reps_ck', sql`"reps" >= 0`),
    check('sets_rpe_ck', sql`"rpe" IS NULL OR ("rpe" >= 1 AND "rpe" <= 10)`),
    check('sets_set_type_ck', sql`"set_type" IN (${inList(SET_TYPES)})`),
  ],
);

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
