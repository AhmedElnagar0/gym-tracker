import type { Equipment } from './constants';

// What the number in sets.weight_kg means depends on the exercise's equipment.
// It is always exactly what the user typed, in kg; it is NOT always total load.
// See "Data conventions" in README.md. Changing this mapping reinterprets history.
export type LoadBasis =
  | 'per_side' // plates on one side only, bar excluded
  | 'per_implement' // one dumbbell / one kettlebell
  | 'stack' // the number on the machine's stack
  | 'added'; // extra load on top of bodyweight (0 = bodyweight only)

const LOAD_BASIS: Record<Equipment, LoadBasis> = {
  barbell: 'per_side',
  ez_bar: 'per_side',
  trap_bar: 'per_side',
  smith_machine: 'per_side',
  plate_loaded: 'per_side',
  dumbbell: 'per_implement',
  kettlebell: 'per_implement',
  machine: 'stack',
  cable: 'stack',
  bodyweight: 'added',
};

export function loadBasis(equipment: Equipment): LoadBasis {
  return LOAD_BASIS[equipment];
}

/** Short unit label shown next to the weight input, e.g. "kg / side". */
export function loadLabel(equipment: Equipment): string {
  switch (equipment) {
    case 'dumbbell':
      return 'kg / dumbbell';
    case 'kettlebell':
      return 'kg / kettlebell';
    default:
      break;
  }
  switch (LOAD_BASIS[equipment]) {
    case 'per_side':
      return 'kg / side';
    case 'stack':
      return 'kg (stack)';
    case 'added':
      return 'kg added';
    case 'per_implement':
      return 'kg';
  }
}
