import type { Equipment, Mechanic, MuscleGroup } from '@/domain/constants';

import type { NewExercise } from './schema';

// The starting exercise catalogue. IDs are fixed so seeding is repeatable and premade
// splits can reference them. NEVER change an existing ID; add new ones and bump
// SEED_VERSION in seed.ts. Timed holds (e.g. plank) are left out: sets need reps.

function exercise(
  id: string,
  name: string,
  muscleGroup: MuscleGroup,
  mechanic: Mechanic,
  equipment: Equipment,
  isUnilateral = false,
): NewExercise {
  return { id, name, muscleGroup, mechanic, equipment, isUnilateral, parentId: null, variantLabel: null };
}

// A variant copies its parent's muscle group and mechanic (a schema rule), so it can only
// be built from the parent object. Equipment defaults to the parent's.
function variant(
  id: string,
  parent: NewExercise,
  name: string,
  variantLabel: string,
  equipment: Equipment = parent.equipment,
): NewExercise {
  return { ...exercise(id, name, parent.muscleGroup, parent.mechanic, equipment), parentId: parent.id, variantLabel };
}

// Chest
export const BENCH_PRESS = exercise('52d49ab3-429d-40f9-a2e1-129cf8472b96', 'Bench Press', 'chest', 'compound', 'barbell');
export const DUMBBELL_BENCH_PRESS = exercise('2dcff90c-78fc-47d6-bad7-5eb32541874f', 'Dumbbell Bench Press', 'chest', 'compound', 'dumbbell');
export const DIPS = exercise('49547359-6f63-4ffb-8a60-3da0de82542a', 'Dips', 'chest', 'compound', 'bodyweight');
export const PEC_DECK = exercise('acad8ea7-9d18-49fa-8cc4-0863cd9c3b19', 'Pec Deck', 'chest', 'isolation', 'machine');

// Back
export const DEADLIFT = exercise('1661cbaa-1be8-413b-b0a5-691bf566c3d9', 'Deadlift', 'back', 'compound', 'barbell');
export const BARBELL_ROW = exercise('b6ebbbd8-e8bf-4604-b563-3a81ce31d5a0', 'Barbell Row', 'back', 'compound', 'barbell');
export const PULL_UP = exercise('260f83a2-cef0-4dbc-a631-6588fa22ae26', 'Pull-Up', 'back', 'compound', 'bodyweight');
export const LAT_PULLDOWN = exercise('d4e70894-dc1c-4f18-bf7f-9fada9abae59', 'Lat Pulldown', 'back', 'compound', 'cable');
export const SEATED_CABLE_ROW = exercise('5b0b6b2f-281f-45d1-a033-e16479e2f190', 'Seated Cable Row', 'back', 'compound', 'cable');

// Shoulders
export const OVERHEAD_PRESS = exercise('59bb13f0-ff68-460b-a9b3-763e3a477e1d', 'Overhead Press', 'shoulders', 'compound', 'barbell');
export const DUMBBELL_SHOULDER_PRESS = exercise('4e55f748-299f-47c3-ae36-4c54c2f5013a', 'Dumbbell Shoulder Press', 'shoulders', 'compound', 'dumbbell');
export const LATERAL_RAISE = exercise('fea9fc49-ae06-425b-a165-e3bfafb32fd8', 'Lateral Raise', 'shoulders', 'isolation', 'dumbbell');
export const FACE_PULL = exercise('a84cb697-c098-4476-aff5-e827d6bb64a3', 'Face Pull', 'shoulders', 'isolation', 'cable');

// Arms
export const EZ_BAR_CURL = exercise('318a0b35-7a74-4ec3-962c-dc81f5b27f6a', 'EZ-Bar Curl', 'biceps', 'isolation', 'ez_bar');
export const DUMBBELL_CURL = exercise('e0bb530a-cd06-4cf6-8ee7-42bb7025a070', 'Dumbbell Curl', 'biceps', 'isolation', 'dumbbell');
export const TRICEPS_PUSHDOWN = exercise('cefcc517-3b04-4228-ba1f-10a1ae07bc9b', 'Triceps Pushdown', 'triceps', 'isolation', 'cable');
export const SKULL_CRUSHER = exercise('4ea61fdc-7e91-4b10-937c-da4bd338bb20', 'Skull Crusher', 'triceps', 'isolation', 'ez_bar');

// Legs
export const BACK_SQUAT = exercise('84d79966-1403-4b1c-b342-c00472d98bf7', 'Back Squat', 'quads', 'compound', 'barbell');
export const FRONT_SQUAT = exercise('01e883a2-4383-47c2-a2e7-7128698ec7b5', 'Front Squat', 'quads', 'compound', 'barbell');
export const LEG_PRESS = exercise('fc509872-e2c6-4dec-800c-b6a2f1c74760', 'Leg Press', 'quads', 'compound', 'plate_loaded');
export const BULGARIAN_SPLIT_SQUAT = exercise('dc9bb61e-6864-49f0-bdd0-671b79c5fbce', 'Bulgarian Split Squat', 'quads', 'compound', 'dumbbell', true);
export const LEG_EXTENSION = exercise('98bc4dd9-b2db-467d-ac25-93fa7c1a74a9', 'Leg Extension', 'quads', 'isolation', 'machine');
export const ROMANIAN_DEADLIFT = exercise('06cfc72c-a673-4a73-b230-53b16b789337', 'Romanian Deadlift', 'hamstrings', 'compound', 'barbell');
export const LEG_CURL = exercise('8f88e9a2-316d-451a-aeca-6cc2089ddef0', 'Leg Curl', 'hamstrings', 'isolation', 'machine');
export const HIP_THRUST = exercise('ba060b4a-3640-4826-b78b-41f0127c4707', 'Hip Thrust', 'glutes', 'compound', 'barbell');
export const CALF_RAISE = exercise('8d3ec822-e3c6-4f92-adeb-14c4fb137c65', 'Standing Calf Raise', 'calves', 'isolation', 'machine');

// Core
export const CABLE_CRUNCH = exercise('18321f9e-3841-43af-8cac-07057c1da814', 'Cable Crunch', 'core', 'isolation', 'cable');

// Variants (one level deep; parents above)
export const INCLINE_BENCH_PRESS = variant('c1733bcb-123d-44e5-8741-214892dd7c40', BENCH_PRESS, 'Incline Bench Press', 'Incline');
export const CLOSE_GRIP_BENCH_PRESS = variant('fb419ddd-5848-443f-945d-7e47306bccbf', BENCH_PRESS, 'Close-Grip Bench Press', 'Close grip');
export const SUMO_DEADLIFT = variant('80095123-b34e-4d4e-ac6d-1919efc4f982', DEADLIFT, 'Sumo Deadlift', 'Sumo');
export const CHIN_UP = variant('450537d4-fa7f-4575-a2aa-058c8ca7a210', PULL_UP, 'Chin-Up', 'Chin-up');
export const PAUSE_SQUAT = variant('b38a3223-678b-499c-8df0-af33c775d96f', BACK_SQUAT, 'Pause Squat', 'Paused');

// Parents first: a variant's row references its parent's row.
export const SEED_EXERCISES: NewExercise[] = [
  BENCH_PRESS,
  DUMBBELL_BENCH_PRESS,
  DIPS,
  PEC_DECK,
  DEADLIFT,
  BARBELL_ROW,
  PULL_UP,
  LAT_PULLDOWN,
  SEATED_CABLE_ROW,
  OVERHEAD_PRESS,
  DUMBBELL_SHOULDER_PRESS,
  LATERAL_RAISE,
  FACE_PULL,
  EZ_BAR_CURL,
  DUMBBELL_CURL,
  TRICEPS_PUSHDOWN,
  SKULL_CRUSHER,
  BACK_SQUAT,
  FRONT_SQUAT,
  LEG_PRESS,
  BULGARIAN_SPLIT_SQUAT,
  LEG_EXTENSION,
  ROMANIAN_DEADLIFT,
  LEG_CURL,
  HIP_THRUST,
  CALF_RAISE,
  CABLE_CRUNCH,
  INCLINE_BENCH_PRESS,
  CLOSE_GRIP_BENCH_PRESS,
  SUMO_DEADLIFT,
  CHIN_UP,
  PAUSE_SQUAT,
];
