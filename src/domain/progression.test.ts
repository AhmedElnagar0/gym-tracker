import { describePlan, sameAsLastTimeHint } from './progression';

const noPlan = { increaseWeight: false, increaseReps: false };
const upWeight = { increaseWeight: true, increaseReps: false };
const last = { weightKg: 60, reps: 8 };

describe('describePlan', () => {
  it('names what was planned', () => {
    expect(describePlan(upWeight)).toBe('↑ weight');
    expect(describePlan({ increaseWeight: false, increaseReps: true })).toBe('↑ reps');
    expect(describePlan({ increaseWeight: true, increaseReps: true })).toBe('↑ weight and reps');
    expect(describePlan(noPlan)).toBe('');
  });
});

describe('sameAsLastTimeHint', () => {
  it('flags an identical set when an increase was planned', () => {
    expect(sameAsLastTimeHint(upWeight, last, { weightKg: 60, reps: 8 })).toBe(
      'Same as last time (60 × 8). You planned ↑ weight.',
    );
  });

  it('stays quiet when the set differs in weight or reps', () => {
    expect(sameAsLastTimeHint(upWeight, last, { weightKg: 62.5, reps: 8 })).toBeNull();
    expect(sameAsLastTimeHint(upWeight, last, { weightKg: 60, reps: 9 })).toBeNull();
  });

  it('stays quiet with no plan, no last time, or nothing entered yet', () => {
    expect(sameAsLastTimeHint(noPlan, last, { weightKg: 60, reps: 8 })).toBeNull();
    expect(sameAsLastTimeHint(upWeight, undefined, { weightKg: 60, reps: 8 })).toBeNull();
    expect(sameAsLastTimeHint(upWeight, last, { weightKg: 60, reps: null })).toBeNull();
  });
});
