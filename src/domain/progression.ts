import { formatSet } from './format';

// "Last time" comparisons on the logging screen. The app never fills in last time's
// numbers for you; it shows them beside the empty fields and, if you planned to
// increase and then type exactly the same set, says so (without blocking the save).

export type NextTimePlan = { increaseWeight: boolean; increaseReps: boolean };
export type SetNumbers = { weightKg: number; reps: number };

export function hasPlan(plan: NextTimePlan): boolean {
  return plan.increaseWeight || plan.increaseReps;
}

/** "↑ weight", "↑ reps", "↑ weight and reps", or "" when nothing was planned. */
export function describePlan(plan: NextTimePlan): string {
  if (plan.increaseWeight && plan.increaseReps) return '↑ weight and reps';
  if (plan.increaseWeight) return '↑ weight';
  if (plan.increaseReps) return '↑ reps';
  return '';
}

/**
 * A hint when the set being entered is identical to the same set last time even though
 * an increase was planned. Returns null otherwise, including when nothing is entered yet.
 */
export function sameAsLastTimeHint(
  plan: NextTimePlan,
  last: SetNumbers | undefined,
  entered: { weightKg: number | null; reps: number | null },
): string | null {
  if (!last || !hasPlan(plan)) return null;
  if (entered.weightKg === null || entered.reps === null) return null;
  if (entered.weightKg !== last.weightKg || entered.reps !== last.reps) return null;
  return `Same as last time (${formatSet(last.weightKg, last.reps)}). You planned ${describePlan(plan)}.`;
}
