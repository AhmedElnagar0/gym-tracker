import { buildCatalogue, type CatalogueExercise, normalizeQuery } from './grouping';

const ex = (
  id: string,
  name: string,
  muscleGroup: CatalogueExercise['muscleGroup'],
  mechanic: CatalogueExercise['mechanic'],
  extra: Partial<CatalogueExercise> = {},
): CatalogueExercise => ({ id, name, muscleGroup, mechanic, parentId: null, variantLabel: null, archivedAt: null, ...extra });

const bench = ex('bench', 'Bench Press', 'chest', 'compound');
const incline = ex('incline', 'Incline Bench Press', 'chest', 'compound', { parentId: 'bench', variantLabel: 'Incline' });
const closeGrip = ex('close', 'Close-Grip Bench Press', 'chest', 'compound', { parentId: 'bench', variantLabel: 'Close grip' });
const dips = ex('dips', 'Dips', 'chest', 'compound');
const fly = ex('fly', 'Cable Fly', 'chest', 'isolation');
const squat = ex('squat', 'Back Squat', 'quads', 'compound');
const curl = ex('curl', 'Dumbbell Curl', 'biceps', 'isolation');
const all = [squat, fly, closeGrip, dips, incline, bench, curl];

// Flattens a catalogue to readable strings, e.g. "Chest", "  Compound", "    Bench Press", "      Incline…".
function outline(sections: ReturnType<typeof buildCatalogue>) {
  const lines: string[] = [];
  for (const s of sections) {
    lines.push(s.title);
    for (const row of s.data) {
      if (row.kind === 'mechanic') lines.push(`  ${row.title}`);
      else lines.push(`${row.isVariant ? '      ' : '    '}${row.exercise.name}`);
    }
  }
  return lines;
}

describe('buildCatalogue', () => {
  it('groups by muscle (fixed order), then compound before isolation, parents A–Z with variants beneath', () => {
    expect(outline(buildCatalogue(all))).toEqual([
      'Chest',
      '  Compound',
      '    Bench Press',
      '      Close-Grip Bench Press',
      '      Incline Bench Press',
      '    Dips',
      '  Isolation',
      '    Cable Fly',
      'Biceps',
      '  Isolation',
      '    Dumbbell Curl',
      'Quads',
      '  Compound',
      '    Back Squat',
    ]);
  });

  it('marks variants and gives every row a unique key', () => {
    const rows = buildCatalogue(all).flatMap((s) => s.data);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    const incl = rows.find((r) => r.kind === 'exercise' && r.exercise.id === 'incline');
    expect(incl).toMatchObject({ isVariant: true });
  });

  it('hides archived exercises unless asked', () => {
    const archived = [squat, { ...curl, archivedAt: 100 }];
    expect(outline(buildCatalogue(archived))).toEqual(['Quads', '  Compound', '    Back Squat']);
    expect(outline(buildCatalogue(archived, { includeArchived: true }))).toContain('    Dumbbell Curl');
  });

  it('shows a variant on its own if its parent is hidden', () => {
    const lines = outline(buildCatalogue([{ ...bench, archivedAt: 5 }, incline]));
    expect(lines).toEqual(['Chest', '  Compound', '    Incline Bench Press']);
  });

  describe('search', () => {
    it('is case- and whitespace-insensitive', () => {
      expect(outline(buildCatalogue(all, { query: '  BACK   squat ' }))).toEqual(['Quads', '  Compound', '    Back Squat']);
    });

    it('shows all variants when the parent matches', () => {
      expect(outline(buildCatalogue(all, { query: 'bench' }))).toEqual([
        'Chest',
        '  Compound',
        '    Bench Press',
        '      Close-Grip Bench Press',
        '      Incline Bench Press',
      ]);
    });

    it('shows only matching variants, under their parent, when only a variant matches', () => {
      expect(outline(buildCatalogue(all, { query: 'incline' }))).toEqual([
        'Chest',
        '  Compound',
        '    Bench Press',
        '      Incline Bench Press',
      ]);
    });

    it('matches the variant label too', () => {
      expect(outline(buildCatalogue(all, { query: 'close grip' }))).toContain('      Close-Grip Bench Press');
    });

    it('returns no sections when nothing matches', () => {
      expect(buildCatalogue(all, { query: 'zzz' })).toEqual([]);
    });
  });

  it('normalizeQuery trims, collapses spaces and lower-cases', () => {
    expect(normalizeQuery('  Lat   PULLdown ')).toBe('lat pulldown');
  });
});
