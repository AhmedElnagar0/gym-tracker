// Fixed vocabularies. They are stored as text in SQLite and enforced there with
// CHECK constraints (see src/db/schema.ts), so changing a value needs a migration.
// The order of each array is the display order in the app.

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
};

export const MECHANICS = ['compound', 'isolation'] as const;
export type Mechanic = (typeof MECHANICS)[number];

export const MECHANIC_LABELS: Record<Mechanic, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
};

export const EQUIPMENT = [
  'barbell',
  'ez_bar',
  'trap_bar',
  'smith_machine',
  'plate_loaded',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'bodyweight',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  ez_bar: 'EZ bar',
  trap_bar: 'Trap bar',
  smith_machine: 'Smith machine',
  plate_loaded: 'Plate-loaded machine',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  machine: 'Machine (pin stack)',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
};

export const SET_TYPES = ['warmup', 'working', 'dropset', 'failure'] as const;
export type SetType = (typeof SET_TYPES)[number];

export const SCHEDULE_MODES = ['rotation', 'weekday'] as const;
export type ScheduleMode = (typeof SCHEDULE_MODES)[number];
