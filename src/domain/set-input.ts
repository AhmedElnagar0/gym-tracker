import { SET_TYPES, type SetType } from './constants';
import { keypadNumber } from './keypad';

// Checks what the set entry panel produced before it is written.

export const MAX_WEIGHT_KG = 1000;
export const MAX_REPS = 999;
/** RPE choices offered in the app (the database allows any value 1–10). */
export const RPE_CHOICES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: 'Warm-up',
  working: 'Working',
  dropset: 'Drop set',
  failure: 'To failure',
};

export type SetDraft = { weight: string; reps: string; rpe: number | null; setType: SetType };
export type ValidSet = { weightKg: number; reps: number; rpe: number | null; setType: SetType };
export type SetErrors = Partial<Record<'weight' | 'reps' | 'rpe' | 'setType', string>>;

export function validateSet(draft: SetDraft): { ok: true; value: ValidSet } | { ok: false; errors: SetErrors } {
  const errors: SetErrors = {};

  // 0 is a valid weight: bodyweight with nothing added, an empty bar's "per side".
  const weightKg = keypadNumber(draft.weight);
  if (weightKg === null) errors.weight = 'Enter the weight (0 if none).';
  else if (weightKg > MAX_WEIGHT_KG) errors.weight = `That's more than ${MAX_WEIGHT_KG} kg.`;

  const reps = keypadNumber(draft.reps);
  if (reps === null) errors.reps = 'Enter the reps.';
  else if (!Number.isInteger(reps) || reps < 1) errors.reps = 'Reps must be a whole number, at least 1.';
  else if (reps > MAX_REPS) errors.reps = `Keep it under ${MAX_REPS}.`;

  if (draft.rpe !== null && (draft.rpe < 1 || draft.rpe > 10)) errors.rpe = 'RPE is between 1 and 10.';
  if (!SET_TYPES.includes(draft.setType)) errors.setType = 'Pick a set type.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { weightKg: weightKg!, reps: reps!, rpe: draft.rpe, setType: draft.setType } };
}
