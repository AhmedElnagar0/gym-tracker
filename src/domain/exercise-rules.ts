// Rules about what may be done to an exercise, given where it is used.
// The database enforces the same things (RESTRICT foreign keys); these give the
// user a clear reason *before* they try, instead of a raw SQLite error.

export type ExerciseUsage = {
  /** Number of workouts the exercise was logged in. */
  workoutCount: number;
  /** Number of split days that include it. */
  splitDayCount: number;
  /** Number of variants (only parents have any). */
  variantCount: number;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Why the exercise can't be deleted, or null if it can. */
export function deleteBlocker(usage: ExerciseUsage): string | null {
  const reasons: string[] = [];
  if (usage.workoutCount > 0) reasons.push(`it's in ${plural(usage.workoutCount, 'workout')}`);
  if (usage.splitDayCount > 0) reasons.push(`it's in ${plural(usage.splitDayCount, 'split day')}`);
  if (usage.variantCount > 0) reasons.push(`it has ${plural(usage.variantCount, 'variant')}`);
  if (reasons.length === 0) return null;
  return `Can't delete: ${reasons.join(', ')}. Archive it instead to hide it.`;
}

/**
 * Equipment decides what logged weights mean (see conventions.ts), so it is locked
 * once any workout uses the exercise.
 */
export function canChangeEquipment(usage: ExerciseUsage): boolean {
  return usage.workoutCount === 0;
}
