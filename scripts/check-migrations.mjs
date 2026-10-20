// Applies every generated migration in drizzle/ to a fresh in-memory SQLite database
// (Node's built-in node:sqlite) and checks that the constraints behave as intended.
// Run with: npm run check:db
//
// This tests the real SQL that ships to the phone, without needing the phone.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// Node runs .ts files directly when, like this one, they only have type imports.
import { SEED_EXERCISES } from '../src/db/seed-data.ts';

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));

function migratedDb() {
  const fresh = new DatabaseSync(':memory:');
  for (const entry of journal.entries) {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) fresh.exec(statement);
    }
  }
  fresh.exec('PRAGMA foreign_keys = ON;');
  return fresh;
}

console.log(`migrations: ${journal.entries.map((e) => e.tag).join(', ')}`);
const db = migratedDb();

let passed = 0;
function ok(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}
// Must fail with a constraint error specifically, so a typo in the test SQL
// (a syntax error) can't masquerade as a passing check.
function rejects(name, sql, ...params) {
  ok(name, () => assert.throws(() => db.prepare(sql).run(...params), /constraint failed/i));
}
const count = (table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;

const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
  .all()
  .map((r) => r.name)
  .sort();
ok('all 8 tables exist', () =>
  assert.deepEqual(tables, [
    'exercises',
    'sets',
    'split_day_exercises',
    'split_days',
    'split_schedule',
    'splits',
    'workout_exercises',
    'workouts',
  ]),
);

const insEx = db.prepare(
  `INSERT INTO exercises (id, parent_id, name, muscle_group, mechanic, equipment) VALUES (?, ?, ?, ?, ?, ?)`,
);
insEx.run('bench', null, 'Bench Press', 'chest', 'compound', 'barbell');
insEx.run('incline', 'bench', 'Incline Bench Press', 'chest', 'compound', 'barbell');

rejects('exercise name is unique, ignoring case', `INSERT INTO exercises (id, name, muscle_group, mechanic, equipment) VALUES ('x', 'bench press', 'chest', 'compound', 'barbell')`);
rejects('blank exercise name rejected', `INSERT INTO exercises (id, name, muscle_group, mechanic, equipment) VALUES ('x', '   ', 'chest', 'compound', 'barbell')`);
rejects('unknown muscle group rejected', `INSERT INTO exercises (id, name, muscle_group, mechanic, equipment) VALUES ('x', 'X', 'pecs', 'compound', 'barbell')`);
rejects('unknown mechanic rejected', `INSERT INTO exercises (id, name, muscle_group, mechanic, equipment) VALUES ('x', 'X', 'chest', 'other', 'barbell')`);
rejects('unknown equipment rejected', `INSERT INTO exercises (id, name, muscle_group, mechanic, equipment) VALUES ('x', 'X', 'chest', 'compound', 'rope')`);
rejects('exercise cannot be its own parent', `INSERT INTO exercises (id, parent_id, name, muscle_group, mechanic, equipment) VALUES ('self', 'self', 'Self', 'chest', 'compound', 'barbell')`);
rejects('parent must exist', `INSERT INTO exercises (id, parent_id, name, muscle_group, mechanic, equipment) VALUES ('orphan', 'missing', 'Orphan', 'chest', 'compound', 'barbell')`);
rejects('cannot delete a parent that has variants', `DELETE FROM exercises WHERE id = 'bench'`);

ok('is_unilateral defaults to 0', () =>
  assert.equal(db.prepare(`SELECT is_unilateral FROM exercises WHERE id = 'bench'`).get().is_unilateral, 0),
);

// Workouts
db.prepare(`INSERT INTO workouts (id, started_at) VALUES ('w1', 1000)`).run();
rejects('only one in-progress workout', `INSERT INTO workouts (id, started_at) VALUES ('w2', 2000)`);
db.prepare(`UPDATE workouts SET ended_at = 1500 WHERE id = 'w1'`).run();
ok('finished workouts do not block a new one', () => {
  db.prepare(`INSERT INTO workouts (id, started_at) VALUES ('w2', 2000)`).run();
  db.prepare(`UPDATE workouts SET ended_at = 2500 WHERE id = 'w2'`).run();
  db.prepare(`INSERT INTO workouts (id, started_at, ended_at) VALUES ('w3', 3000, 3500)`).run();
});
rejects('ended_at cannot be before started_at', `INSERT INTO workouts (id, started_at, ended_at) VALUES ('bad', 5000, 4000)`);

db.prepare(`INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index) VALUES ('we1', 'w1', 'incline', 0)`).run();
const insSet = db.prepare(
  `INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps, rpe, set_type) VALUES (?, 'we1', ?, ?, ?, ?, ?)`,
);
insSet.run('s1', 0, 40, 8, null, 'working');
insSet.run('s2', 1, 42.5, 6, 9.5, 'failure');

rejects('negative weight rejected', `INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps) VALUES ('x', 'we1', 2, -1, 5)`);
rejects('negative reps rejected', `INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps) VALUES ('x', 'we1', 2, 10, -1)`);
rejects('RPE above 10 rejected', `INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps, rpe) VALUES ('x', 'we1', 2, 10, 5, 11)`);
rejects('RPE below 1 rejected', `INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps, rpe) VALUES ('x', 'we1', 2, 10, 5, 0)`);
rejects('unknown set type rejected', `INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps, set_type) VALUES ('x', 'we1', 2, 10, 5, 'amrap')`);
rejects('set must belong to an existing workout exercise', `INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps) VALUES ('x', 'missing', 0, 10, 5)`);
ok('set_type defaults to working', () => {
  db.prepare(`INSERT INTO sets (id, workout_exercise_id, set_index, weight_kg, reps) VALUES ('s3', 'we1', 2, 40, 8)`).run();
  assert.equal(db.prepare(`SELECT set_type FROM sets WHERE id = 's3'`).get().set_type, 'working');
});

rejects('cannot delete an exercise that has history', `DELETE FROM exercises WHERE id = 'incline'`);

ok('deleting a workout cascades to its exercises and sets', () => {
  db.prepare(`DELETE FROM workouts WHERE id = 'w1'`).run();
  assert.equal(count('workout_exercises'), 0);
  assert.equal(count('sets'), 0);
});
ok('unused exercise can be deleted once its history is gone', () => {
  db.prepare(`DELETE FROM exercises WHERE id = 'incline'`).run();
  db.prepare(`DELETE FROM exercises WHERE id = 'bench'`).run();
});

// Splits
insEx.run('squat', null, 'Back Squat', 'quads', 'compound', 'barbell');
db.prepare(`INSERT INTO splits (id, name, is_active) VALUES ('ppl', 'PPL', 1)`).run();
rejects('only one active split', `INSERT INTO splits (id, name, is_active) VALUES ('ul', 'Upper/Lower', 1)`);
ok('inactive splits are unlimited', () => {
  db.prepare(`INSERT INTO splits (id, name, is_active) VALUES ('ul', 'Upper/Lower', 0)`).run();
  db.prepare(`INSERT INTO splits (id, name) VALUES ('fb', 'Full Body')`).run();
});
rejects('unknown schedule mode rejected', `INSERT INTO splits (id, name, schedule_mode) VALUES ('x', 'X', 'random')`);

db.prepare(`INSERT INTO split_days (id, split_id, name, order_index) VALUES ('legsA', 'ppl', 'Legs A', 0)`).run();
db.prepare(`INSERT INTO split_day_exercises (id, split_day_id, exercise_id, order_index) VALUES ('sde1', 'legsA', 'squat', 0)`).run();
ok('target_sets defaults to 3', () =>
  assert.equal(db.prepare(`SELECT target_sets FROM split_day_exercises WHERE id = 'sde1'`).get().target_sets, 3),
);
rejects('target_sets must be at least 1', `INSERT INTO split_day_exercises (id, split_day_id, exercise_id, order_index, target_sets) VALUES ('x', 'legsA', 'squat', 1, 0)`);
db.prepare(`INSERT INTO split_schedule (split_id, weekday, split_day_id) VALUES ('ppl', 0, 'legsA')`).run();
rejects('one day per weekday per split', `INSERT INTO split_schedule (split_id, weekday, split_day_id) VALUES ('ppl', 0, 'legsA')`);
rejects('weekday must be 0..6', `INSERT INTO split_schedule (split_id, weekday, split_day_id) VALUES ('ppl', 7, 'legsA')`);
rejects('cannot delete an exercise used in a split', `DELETE FROM exercises WHERE id = 'squat'`);

db.prepare(`INSERT INTO workouts (id, started_at, ended_at, split_day_id) VALUES ('w4', 4000, 4500, 'legsA')`).run();
ok('deleting a split keeps its workouts and clears their split_day_id', () => {
  db.prepare(`DELETE FROM splits WHERE id = 'ppl'`).run();
  assert.equal(count('split_days'), 0);
  assert.equal(count('split_day_exercises'), 0);
  assert.equal(count('split_schedule'), 0);
  assert.equal(db.prepare(`SELECT split_day_id FROM workouts WHERE id = 'w4'`).get().split_day_id, null);
});

ok('no foreign key violations remain', () => assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0));

// The real seed data, inserted the way the app does it (one multi-row INSERT, FK on).
ok(`all ${SEED_EXERCISES.length} seed exercises satisfy the schema`, () => {
  const seeded = migratedDb();
  const cols = ['id', 'parent_id', 'name', 'variant_label', 'muscle_group', 'mechanic', 'equipment', 'is_unilateral'];
  const rows = SEED_EXERCISES.map((e) => [
    e.id, e.parentId, e.name, e.variantLabel, e.muscleGroup, e.mechanic, e.equipment, e.isUnilateral ? 1 : 0,
  ]);
  const placeholders = rows.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ');
  seeded.prepare(`INSERT INTO exercises (${cols.join(', ')}) VALUES ${placeholders}`).run(...rows.flat());
  assert.equal(seeded.prepare('SELECT count(*) AS n FROM exercises').get().n, SEED_EXERCISES.length);
  assert.equal(seeded.prepare('PRAGMA foreign_key_check').all().length, 0);
});

console.log(`\n${passed} checks passed`);
