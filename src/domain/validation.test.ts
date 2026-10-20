import { type ExerciseDraft, normalizeName, validateExerciseDraft } from './validation';

const draft = (overrides: Partial<ExerciseDraft> = {}): ExerciseDraft => ({
  name: 'Cable Fly',
  variantLabel: null,
  muscleGroup: 'chest',
  mechanic: 'isolation',
  equipment: 'cable',
  isUnilateral: false,
  ...overrides,
});

describe('normalizeName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeName('  Bench    Press ')).toBe('Bench Press');
  });
});

describe('validateExerciseDraft', () => {
  it('accepts a complete parent exercise and normalizes the name', () => {
    const result = validateExerciseDraft(draft({ name: '  Cable   Fly ' }), { isVariant: false });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Cable Fly', variantLabel: null, muscleGroup: 'chest', mechanic: 'isolation', equipment: 'cable', isUnilateral: false },
    });
  });

  it('drops a variant label on a parent exercise', () => {
    const result = validateExerciseDraft(draft({ variantLabel: 'stray' }), { isVariant: false });
    expect(result.ok && result.value.variantLabel).toBeNull();
  });

  it('rejects blank and over-long names', () => {
    expect(validateExerciseDraft(draft({ name: '   ' }), { isVariant: false })).toEqual({
      ok: false,
      errors: { name: 'Enter a name.' },
    });
    const long = validateExerciseDraft(draft({ name: 'x'.repeat(61) }), { isVariant: false });
    expect(long.ok).toBe(false);
  });

  it('requires a label for variants', () => {
    const result = validateExerciseDraft(draft({ variantLabel: '  ' }), { isVariant: true });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.variantLabel).toMatch(/label/);
  });

  it('keeps a trimmed label for variants', () => {
    const result = validateExerciseDraft(draft({ variantLabel: ' Incline ' }), { isVariant: true });
    expect(result.ok && result.value.variantLabel).toBe('Incline');
  });

  it('reports every missing choice at once', () => {
    const result = validateExerciseDraft(draft({ muscleGroup: null, mechanic: null, equipment: null }), { isVariant: false });
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['equipment', 'mechanic', 'muscleGroup']);
  });
});
