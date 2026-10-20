import { EQUIPMENT } from './constants';
import { loadBasis, loadLabel } from './conventions';

describe('load conventions', () => {
  it('treats every loaded-bar and plate-loaded equipment as per side', () => {
    for (const e of ['barbell', 'ez_bar', 'trap_bar', 'smith_machine', 'plate_loaded'] as const) {
      expect(loadBasis(e)).toBe('per_side');
      expect(loadLabel(e)).toBe('kg / side');
    }
  });

  it('treats dumbbells and kettlebells as per implement', () => {
    expect(loadBasis('dumbbell')).toBe('per_implement');
    expect(loadLabel('dumbbell')).toBe('kg / dumbbell');
    expect(loadLabel('kettlebell')).toBe('kg / kettlebell');
  });

  it('labels stack and bodyweight loads', () => {
    expect(loadLabel('machine')).toBe('kg (stack)');
    expect(loadLabel('cable')).toBe('kg (stack)');
    expect(loadLabel('bodyweight')).toBe('kg added');
  });

  it('has a basis and a label for every equipment type', () => {
    for (const e of EQUIPMENT) {
      expect(loadBasis(e)).toBeTruthy();
      expect(loadLabel(e)).toMatch(/^kg/);
    }
  });
});
