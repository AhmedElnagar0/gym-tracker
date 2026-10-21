import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import type { Exercise } from '@/db/schema';
import { buildCatalogue } from '@/domain/grouping';
import { useColors } from '@/hooks/use-colors';
import { catalogueQuery } from '@/repo/exercises';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

import { ExerciseRow } from './exercise-row';
import { Notice } from './ui/notice';

/** Searchable, grouped list of non-archived exercises. Used for workouts (and split days, M7). */
export function ExercisePicker({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const c = useColors();
  const [query, setQuery] = useState('');
  const { data, updatedAt } = useLiveQuery(catalogueQuery(db));
  const sections = useMemo(() => buildCatalogue(data, { query }), [data, query]);

  return (
    <SectionList
      style={{ backgroundColor: c.background }}
      sections={updatedAt ? sections : []}
      keyExtractor={(row) => row.key}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
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
            autoFocus
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
