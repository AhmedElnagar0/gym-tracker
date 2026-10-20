import { canChangeEquipment, deleteBlocker } from './exercise-rules';

const unused = { workoutCount: 0, splitDayCount: 0, variantCount: 0 };

describe('deleteBlocker', () => {
  it('allows deleting an unused exercise', () => {
    expect(deleteBlocker(unused)).toBeNull();
  });

  it('explains every reason, with correct plurals', () => {
    expect(deleteBlocker({ workoutCount: 4, splitDayCount: 1, variantCount: 2 })).toBe(
      "Can't delete: it's in 4 workouts, it's in 1 split day, it has 2 variants. Archive it instead to hide it.",
    );
  });

  it('blocks a parent with variants even if unused', () => {
    expect(deleteBlocker({ ...unused, variantCount: 1 })).toMatch(/1 variant\b/);
  });
});

describe('canChangeEquipment', () => {
  it('is allowed until the exercise has been logged', () => {
    expect(canChangeEquipment(unused)).toBe(true);
    expect(canChangeEquipment({ ...unused, splitDayCount: 3 })).toBe(true);
    expect(canChangeEquipment({ ...unused, workoutCount: 1 })).toBe(false);
  });
});
