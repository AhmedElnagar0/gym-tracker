import { EQUIPMENT, MECHANICS, MUSCLE_GROUPS } from '@/domain/constants';

import { SEED_EXERCISES } from './seed-data';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('seed exercises', () => {
  it('has unique, valid v4 UUIDs', () => {
    const ids = SEED_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });

  it('has names that are unique ignoring case', () => {
    const names = SEED_EXERCISES.map((e) => e.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses only known muscle groups, mechanics and equipment', () => {
    for (const e of SEED_EXERCISES) {
      expect(MUSCLE_GROUPS).toContain(e.muscleGroup);
      expect(MECHANICS).toContain(e.mechanic);
      expect(EQUIPMENT).toContain(e.equipment);
    }
  });

  it('lists every parent before its variants, and variants are one level deep', () => {
    const seen = new Map<string, (typeof SEED_EXERCISES)[number]>();
    for (const e of SEED_EXERCISES) {
      if (e.parentId) {
        const parent = seen.get(e.parentId);
        expect(parent).toBeDefined();
        expect(parent?.parentId).toBeNull();
      }
      seen.set(e.id, e);
    }
  });

  it('gives variants their parent’s muscle group and mechanic, and a label', () => {
    const byId = new Map(SEED_EXERCISES.map((e) => [e.id, e]));
    for (const e of SEED_EXERCISES) {
      if (!e.parentId) {
        expect(e.variantLabel).toBeNull();
        continue;
      }
      const parent = byId.get(e.parentId)!;
      expect(e.muscleGroup).toBe(parent.muscleGroup);
      expect(e.mechanic).toBe(parent.mechanic);
      expect(e.variantLabel?.trim()).toBeTruthy();
    }
  });

  it('covers every muscle group at least once', () => {
    const covered = new Set(SEED_EXERCISES.map((e) => e.muscleGroup));
    for (const m of MUSCLE_GROUPS) expect(covered).toContain(m);
  });
});
