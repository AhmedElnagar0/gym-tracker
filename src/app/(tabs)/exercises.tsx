import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ExerciseRow } from '@/components/exercise-row';
import { Button } from '@/components/ui/button';
import { dismissKeyboardOnScroll } from '@/components/ui/keyboard';
import { Notice } from '@/components/ui/notice';
import { db } from '@/db/client';
import { buildCatalogue } from '@/domain/grouping';
import { useColors } from '@/hooks/use-colors';
import { catalogueQuery } from '@/repo/exercises';
import { routes } from '@/routes';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

export default function ExercisesScreen() {
  const c = useColors();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Re-runs automatically whenever the exercises table changes.
  const { data, updatedAt, error } = useLiveQuery(catalogueQuery(db));
  const sections = useMemo(
    () => buildCatalogue(data, { query, includeArchived: showArchived }),
    [data, query, showArchived],
  );
  const loaded = updatedAt !== undefined;

  const header = (
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
      <View style={styles.archivedRow}>
        <Text style={[styles.archivedLabel, { color: c.text }]}>Show archived</Text>
        <Switch value={showArchived} onValueChange={setShowArchived} />
      </View>
      <Button title="New exercise" onPress={() => router.push(routes.newExercise())} />
      {error ? <Notice title="Couldn't load exercises" body={error.message} /> : null}
      {loaded && sections.length === 0 ? (
        <Notice
          title={query ? 'No matches' : 'No exercises'}
          body={query ? `Nothing matches "${query.trim()}".` : 'Add one with "New exercise".'}
        />
      ) : null}
    </View>
  );

  return (
    <SectionList
      style={{ backgroundColor: c.background }}
      sections={loaded ? sections : []}
      keyExtractor={(row) => row.key}
      ListHeaderComponent={header}
      {...dismissKeyboardOnScroll}
      contentInsetAdjustmentBehavior="automatic"
      renderSectionHeader={({ section }) => (
        <Text style={[styles.section, { color: c.text, backgroundColor: c.background }]}>{section.title}</Text>
      )}
      renderItem={({ item }) =>
        item.kind === 'mechanic' ? (
          <Text style={[styles.mechanic, { color: c.textMuted }]}>{item.title}</Text>
        ) : (
          <ExerciseRow
            exercise={item.exercise}
            isVariant={item.isVariant}
            onPress={() => router.push(routes.exercise(item.exercise.id))}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.md, gap: spacing.md },
  search: { minHeight: TAP_TARGET - 8, borderRadius: 12, paddingHorizontal: spacing.md, fontSize: fontSize.body },
  archivedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  archivedLabel: { fontSize: fontSize.body },
  section: {
    fontSize: fontSize.large,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  mechanic: {
    fontSize: fontSize.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
