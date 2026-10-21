import { type SetDraft, validateSet } from './set-input';

const draft = (overrides: Partial<SetDraft> = {}): SetDraft => ({
  weight: '60',
  reps: '8',
  rpe: null,
  setType: 'working',
  ...overrides,
});

describe('validateSet', () => {
  it('accepts a normal set', () => {
    expect(validateSet(draft({ weight: '62.5', rpe: 8.5 }))).toEqual({
      ok: true,
      value: { weightKg: 62.5, reps: 8, rpe: 8.5, setType: 'working' },
    });
  });

  it('accepts 0 kg (bodyweight, or an empty bar per side)', () => {
    expect(validateSet(draft({ weight: '0' })).ok).toBe(true);
  });

  it('requires weight and reps', () => {
    expect(validateSet(draft({ weight: '', reps: '' }))).toMatchObject({
      ok: false,
      errors: { weight: expect.any(String), reps: expect.any(String) },
    });
  });

  it('rejects 0 reps and absurd values', () => {
    expect(validateSet(draft({ reps: '0' }))).toMatchObject({ ok: false, errors: { reps: expect.any(String) } });
    expect(validateSet(draft({ weight: '1001' }))).toMatchObject({ ok: false, errors: { weight: expect.any(String) } });
  });

  it('rejects RPE outside 1–10', () => {
    expect(validateSet(draft({ rpe: 11 }))).toMatchObject({ ok: false, errors: { rpe: expect.any(String) } });
  });
});
