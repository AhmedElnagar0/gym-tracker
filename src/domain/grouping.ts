import {
  MECHANICS,
  MECHANIC_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Mechanic,
  type MuscleGroup,
} from './constants';

// Turns the flat exercise list into what the catalogue screen shows:
//   Muscle group (section)
//     Compound / Isolation (sub-heading row)
//       Parent exercise
//         Variant (indented)

export type CatalogueExercise = {
  id: string;
  parentId: string | null;
  name: string;
  variantLabel: string | null;
  muscleGroup: MuscleGroup;
  mechanic: Mechanic;
  archivedAt: number | null;
};

export type CatalogueRow<E extends CatalogueExercise = CatalogueExercise> =
  | { kind: 'mechanic'; key: string; title: string }
  | { kind: 'exercise'; key: string; exercise: E; isVariant: boolean };

export type CatalogueSection<E extends CatalogueExercise = CatalogueExercise> = {
  key: MuscleGroup;
  title: string;
  data: CatalogueRow<E>[];
};

export type CatalogueOptions = { query?: string; includeArchived?: boolean };

/** Lower-cased, trimmed, single-spaced, for case-insensitive search. */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function matches(e: CatalogueExercise, q: string): boolean {
  return e.name.toLowerCase().includes(q) || (e.variantLabel?.toLowerCase().includes(q) ?? false);
}

const byName = (a: CatalogueExercise, b: CatalogueExercise) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

export function buildCatalogue<E extends CatalogueExercise>(
  all: readonly E[],
  { query = '', includeArchived = false }: CatalogueOptions = {},
): CatalogueSection<E>[] {
  const visible = includeArchived ? [...all] : all.filter((e) => e.archivedAt === null);
  const visibleIds = new Set(visible.map((e) => e.id));

  const variantsOf = new Map<string, E[]>();
  const topLevel: E[] = [];
  for (const e of visible) {
    // A variant whose parent is hidden is shown on its own rather than lost.
    if (e.parentId && visibleIds.has(e.parentId)) {
      const list = variantsOf.get(e.parentId) ?? [];
      list.push(e);
      variantsOf.set(e.parentId, list);
    } else {
      topLevel.push(e);
    }
  }

  const q = normalizeQuery(query);
  const sections: CatalogueSection<E>[] = [];

  for (const muscle of MUSCLE_GROUPS) {
    const data: CatalogueRow<E>[] = [];
    for (const mechanic of MECHANICS) {
      const rows: CatalogueRow<E>[] = [];
      const parents = topLevel.filter((e) => e.muscleGroup === muscle && e.mechanic === mechanic).sort(byName);
      for (const parent of parents) {
        const variants = (variantsOf.get(parent.id) ?? []).sort(byName);
        const parentMatches = q === '' || matches(parent, q);
        // A matching parent shows all its variants; otherwise only the matching
        // variants are shown, under their parent for context.
        const shownVariants = parentMatches ? variants : variants.filter((v) => matches(v, q));
        if (!parentMatches && shownVariants.length === 0) continue;
        rows.push({ kind: 'exercise', key: parent.id, exercise: parent, isVariant: false });
        for (const v of shownVariants) rows.push({ kind: 'exercise', key: v.id, exercise: v, isVariant: true });
      }
      if (rows.length > 0) {
        data.push({ kind: 'mechanic', key: `${muscle}:${mechanic}`, title: MECHANIC_LABELS[mechanic] });
        data.push(...rows);
      }
    }
    if (data.length > 0) sections.push({ key: muscle, title: MUSCLE_GROUP_LABELS[muscle], data });
  }
  return sections;
}
