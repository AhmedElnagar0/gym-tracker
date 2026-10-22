import Ionicons from '@expo/vector-icons/Ionicons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import type { Exercise } from '@/db/schema';
import type { MuscleGroup } from '@/domain/constants';
import { buildCatalogue, muscleGroupList } from '@/domain/grouping';
import { useColors } from '@/hooks/use-colors';
import { catalogueQuery } from '@/repo/exercises';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

import { ExerciseRow } from './exercise-row';
import { dismissKeyboardOnScroll } from './ui/keyboard';
import { Notice } from './ui/notice';
import { Segmented } from './ui/segmented';

// Choosing an exercise to add (to a workout now; to a split day in M7). Two ways in:
// "By muscle" lists the muscle groups, and tapping one opens a screen with just its
// exercises; "All exercises" is the full grouped list with search.

type Mode = 'muscle' | 'all';
const MODES = [
  { value: 'muscle', label: 'By muscle' },
  { value: 'all', label: 'All exercises' },
] as const;

/** The add-exercise screen's body: the switch plus whichever list is selected. */
export function ExercisePicker({
  onPick,
  onOpenMuscle,
}: {
  onPick: (exercise: Exercise) => void;
  onOpenMuscle: (muscle: MuscleGroup) => void;
}) {
  const c = useColors();
  const [mode, setMode] = useState<Mode>('muscle');
  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={styles.switch}>
        <Segmented options={MODES} value={mode} onChange={setMode} />
      </View>
      {mode === 'muscle' ? <MuscleGroupList onOpen={onOpenMuscle} /> : <AllExercisesList onPick={onPick} />}
    </View>
  );
}

/** Just the main muscle groups that have exercises, with how many each has. */
function MuscleGroupList({ onOpen }: { onOpen: (muscle: MuscleGroup) => void }) {
  const c = useColors();
  const { data, updatedAt } = useLiveQuery(catalogueQuery(db));
  const groups = useMemo(() => muscleGroupList(data), [data]);
  return (
    <FlatList
      data={updatedAt ? groups : []}
      keyExtractor={(g) => g.muscle}
      contentContainerStyle={styles.list}
      ListEmptyComponent={updatedAt ? <Notice title="No exercises" body="Add some on the Exercises tab." /> : null}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${item.count} exercises`}
          onPress={() => onOpen(item.muscle)}
          style={({ pressed }) => [styles.muscleRow, { backgroundColor: pressed ? c.border : c.surface }]}>
          <Text style={[styles.muscleTitle, { color: c.text }]}>{item.title}</Text>
          <Text style={[styles.muscleCount, { color: c.textMuted }]}>{item.count}</Text>
          <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
        </Pressable>
      )}
    />
  );
}

/** One muscle group's exercises: compound then isolation, variants under their parent. */
export function MuscleExercisesList({ muscle, onPick }: { muscle: MuscleGroup; onPick: (exercise: Exercise) => void }) {
  const c = useColors();
  const { data, updatedAt } = useLiveQuery(catalogueQuery(db));
  const rows = useMemo(
    () => buildCatalogue(data.filter((e) => e.muscleGroup === muscle))[0]?.data ?? [],
    [data, muscle],
  );
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={updatedAt ? rows : []}
      keyExtractor={(row) => row.key}
      contentInsetAdjustmentBehavior="automatic"
      ListEmptyComponent={updatedAt ? <Notice title="No exercises here" body="Add some on the Exercises tab." /> : null}
      renderItem={({ item }) =>
        item.kind === 'mechanic' ? (
          <Text style={[styles.mechanic, { color: c.textMuted }]}>{item.title}</Text>
        ) : (
          <ExerciseRow exercise={item.exercise} isVariant={item.isVariant} onPress={() => onPick(item.exercise)} />
        )
      }
    />
  );
}

/** Every non-archived exercise, grouped as in the catalogue, with search. */
function AllExercisesList({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const c = useColors();
  const [query, setQuery] = useState('');
  const { data, updatedAt } = useLiveQuery(catalogueQuery(db));
  const sections = useMemo(() => buildCatalogue(data, { query }), [data, query]);

  return (
    <SectionList
      style={{ backgroundColor: c.background }}
      sections={updatedAt ? sections : []}
      keyExtractor={(row) => row.key}
      {...dismissKeyboardOnScroll}
      ListHeaderComponent={
        <View style={styles.header}>
          <TextInput
            style={[styles.search, { color: c.text, backgroundColor: c.surface }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            placeholderTextColor={c.textMuted}
            clearButtonMode="while-editing"
            autoCorrect={false}
            returnKeyType="search"
          />
          {updatedAt && sections.length === 0 ? (
            <Notice title="No matches" body="Create new exercises on the Exercises tab." />
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.section, { color: c.text, backgroundColor: c.background }]}>{section.title}</Text>
      )}
      renderItem={({ item }) =>
        item.kind === 'mechanic' ? (
          <Text style={[styles.mechanic, { color: c.textMuted }]}>{item.title}</Text>
        ) : (
          <ExerciseRow exercise={item.exercise} isVariant={item.isVariant} onPress={() => onPick(item.exercise)} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switch: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { padding: spacing.md, gap: spacing.sm },
  muscleRow: {
    minHeight: TAP_TARGET + 8,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muscleTitle: { flex: 1, fontSize: fontSize.large, fontWeight: '700' },
  muscleCount: { fontSize: fontSize.body, fontVariant: ['tabular-nums'] },
  header: { padding: spacing.md, gap: spacing.md },
  search: { minHeight: TAP_TARGET - 8, borderRadius: 12, paddingHorizontal: spacing.md, fontSize: fontSize.body },
  section: { fontSize: fontSize.large, fontWeight: '700', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  mechanic: {
    fontSize: fontSize.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
