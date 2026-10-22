import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ExerciseHistory } from '@/components/exercise-history';
import { ExerciseRow } from '@/components/exercise-row';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { db } from '@/db/client';
import { exercises, sets, workoutExercises, workouts } from '@/db/schema';
import { EQUIPMENT_LABELS, MECHANIC_LABELS, MUSCLE_GROUP_LABELS } from '@/domain/constants';
import { loadLabel } from '@/domain/conventions';
import { deleteBlocker } from '@/domain/exercise-rules';
import { useColors } from '@/hooks/use-colors';
import { useDbQuery } from '@/hooks/use-db-query';
import { deleteExercise, getExercise, getUsage, setArchived } from '@/repo/exercises';
import { getExerciseHistory } from '@/repo/history';
import { routes } from '@/routes';
import { fontSize, spacing } from '@/theme';

export default function ExerciseDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Both re-run when the exercises table changes (e.g. after editing or adding a variant).
  const { data: rows, updatedAt } = useLiveQuery(db.select().from(exercises).where(eq(exercises.id, id)), [id]);
  const { data: variants } = useLiveQuery(
    db.select().from(exercises).where(eq(exercises.parentId, id)).orderBy(exercises.name),
    [id],
  );
  const exercise = rows[0];
  const [tab, setTab] = useState<'details' | 'history'>('details');
  const history = useDbQuery(() => getExerciseHistory(db, id), [workouts, workoutExercises, sets]);

  if (updatedAt === undefined) return null; // first load still running
  if (!exercise) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Exercise' }} />
        <Notice title="Exercise not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const parent = exercise.parentId ? getExercise(db, exercise.parentId) : undefined;
  const usage = getUsage(db, exercise.id);
  const archived = exercise.archivedAt !== null;

  const onArchive = () => {
    const result = setArchived(db, exercise.id, !archived);
    if (!result.ok) Alert.alert('Not changed', result.error);
  };

  const onDelete = () => {
    const blocker = deleteBlocker(usage);
    if (blocker) {
      Alert.alert('Can’t delete', blocker);
      return;
    }
    Alert.alert(`Delete ${exercise.name}?`, 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const result = deleteExercise(db, exercise.id);
          if (result.ok) router.back();
          else Alert.alert('Can’t delete', result.error);
        },
      },
    ]);
  };

  const facts: [string, string][] = [
    ['Muscle', MUSCLE_GROUP_LABELS[exercise.muscleGroup]],
    ['Type', MECHANIC_LABELS[exercise.mechanic]],
    ['Equipment', EQUIPMENT_LABELS[exercise.equipment]],
    ['Weights logged in', loadLabel(exercise.equipment)],
    ['Sides', exercise.isUnilateral ? 'One side at a time (reps per side)' : 'Both together'],
    ['Logged in', usage.workoutCount === 1 ? '1 workout' : `${usage.workoutCount} workouts`],
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise.name }} />
      <Segmented
        options={[
          { value: 'details', label: 'Details' },
          { value: 'history', label: `History (${history.length})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'history' ? (
        <ExerciseHistory sessions={history} hasVariants={variants.length > 0} />
      ) : (
        <>
          {archived ? <Notice title="Archived" body="Hidden from the catalogue and pickers. History is kept." /> : null}

          {parent ? (
            <View style={styles.block}>
              <Text style={[styles.heading, { color: c.textMuted }]}>Variant of</Text>
              <ExerciseRow
                exercise={parent}
                isVariant={false}
                onPress={() => router.push(routes.exercise(parent.id))}
              />
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: c.surface }]}>
            {facts.map(([label, value]) => (
              <View key={label} style={styles.fact}>
                <Text style={[styles.factLabel, { color: c.textMuted }]}>{label}</Text>
                <Text style={[styles.factValue, { color: c.text }]}>{value}</Text>
              </View>
            ))}
          </View>

          {!parent ? (
            <View style={styles.block}>
              <Text style={[styles.heading, { color: c.textMuted }]}>Variants</Text>
              {variants.length === 0 ? (
                <Text style={[styles.empty, { color: c.textMuted }]}>None yet.</Text>
              ) : (
                variants.map((v) => (
                  <ExerciseRow
                    key={v.id}
                    exercise={v}
                    isVariant={false}
                    onPress={() => router.push(routes.exercise(v.id))}
                  />
                ))
              )}
              <Button
                title="Add variant"
                variant="secondary"
                onPress={() => router.push(routes.newVariant(exercise.id))}
              />
            </View>
          ) : null}

          <View style={styles.block}>
            <Button
              title="Edit"
              variant="secondary"
              onPress={() => router.push(routes.editExercise(exercise.id))}
            />
            <Button title={archived ? 'Restore from archive' : 'Archive'} variant="secondary" onPress={onArchive} />
            <Button title="Delete" variant="danger" onPress={onDelete} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  heading: { fontSize: fontSize.small, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  factLabel: { fontSize: fontSize.body },
  factValue: { fontSize: fontSize.body, flexShrink: 1, textAlign: 'right' },
  empty: { fontSize: fontSize.body },
});
