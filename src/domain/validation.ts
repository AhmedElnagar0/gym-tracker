import {
  EQUIPMENT,
  MECHANICS,
  MUSCLE_GROUPS,
  type Equipment,
  type Mechanic,
  type MuscleGroup,
} from './constants';

export const NAME_MAX_LENGTH = 60;
export const VARIANT_LABEL_MAX_LENGTH = 30;

/** Trims and collapses internal whitespace: "  Bench   Press " → "Bench Press". */
export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** What the exercise form produces, before it is checked. */
export type ExerciseDraft = {
  name: string;
  variantLabel: string | null;
  muscleGroup: MuscleGroup | null;
  mechanic: Mechanic | null;
  equipment: Equipment | null;
  isUnilateral: boolean;
};

export type ValidExercise = {
  name: string;
  variantLabel: string | null;
  muscleGroup: MuscleGroup;
  mechanic: Mechanic;
  equipment: Equipment;
  isUnilateral: boolean;
};

export type DraftField = 'name' | 'variantLabel' | 'muscleGroup' | 'mechanic' | 'equipment';
export type DraftErrors = Partial<Record<DraftField, string>>;

export type Validation = { ok: true; value: ValidExercise } | { ok: false; errors: DraftErrors };

export function validateExerciseDraft(draft: ExerciseDraft, { isVariant }: { isVariant: boolean }): Validation {
  const errors: DraftErrors = {};

  const name = normalizeName(draft.name);
  if (name === '') errors.name = 'Enter a name.';
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Keep it under ${NAME_MAX_LENGTH} characters.`;

  let variantLabel: string | null = null;
  if (isVariant) {
    variantLabel = normalizeName(draft.variantLabel ?? '');
    if (variantLabel === '') errors.variantLabel = 'Enter a short label, e.g. "Incline".';
    else if (variantLabel.length > VARIANT_LABEL_MAX_LENGTH)
      errors.variantLabel = `Keep it under ${VARIANT_LABEL_MAX_LENGTH} characters.`;
  }

  if (!draft.muscleGroup || !MUSCLE_GROUPS.includes(draft.muscleGroup)) errors.muscleGroup = 'Pick a muscle group.';
  if (!draft.mechanic || !MECHANICS.includes(draft.mechanic)) errors.mechanic = 'Pick compound or isolation.';
  if (!draft.equipment || !EQUIPMENT.includes(draft.equipment)) errors.equipment = 'Pick the equipment.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      variantLabel,
      // Non-null: checked above.
      muscleGroup: draft.muscleGroup!,
      mechanic: draft.mechanic!,
      equipment: draft.equipment!,
      isUnilateral: draft.isUnilateral,
    },
  };
}
