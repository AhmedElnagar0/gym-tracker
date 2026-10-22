import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { db } from '@/db/client';
import { exercises, sets, workoutExercises, workouts, type Workout } from '@/db/schema';
import { loadLabel } from '@/domain/conventions';
import {
  backupIsStale,
  formatClock,
  formatDate,
  formatDaysAgo,
  formatDuration,
  formatSet,
  formatWeight,
  plural,
} from '@/domain/format';
import { describePlan } from '@/domain/progression';
import { SET_TYPE_LABELS } from '@/domain/set-input';
import { nowUnix } from '@/domain/time';
import { useColors } from '@/hooks/use-colors';
import { useDbQuery } from '@/hooks/use-db-query';
import { lastExportedAt } from '@/repo/backup';
import { listWorkoutExercises, type LoggedSet, type WorkoutExerciseDetail } from '@/repo/workout-exercises';
import { deleteWorkout, discardWorkout, finishWorkout, getWorkout, removeEmptyExercises } from '@/repo/workouts';
import { routes } from '@/routes';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

/** Overview of one workout: its exercises in order, each with a summary of its sets. */
export default function WorkoutScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useDbQuery(() => {
    const workout = getWorkout(db, id);
    return workout ? { workout, items: listWorkoutExercises(db, id) } : null;
  }, [workouts, workoutExercises, sets, exercises]);
  // A finished workout opens read-only; "Edit workout" switches to the editable overview.
  const [editingPast, setEditingPast] = useState(false);
  // However editing ends (Done, or Back), don't leave exercises with no sets behind.
  useEffect(() => {
    if (!editingPast) return;
    return () => {
      removeEmptyExercises(db, id);
    };
  }, [editingPast, id]);

  if (!data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Notice title="Workout not found" body="It may have been discarded or deleted." />
      </Screen>
    );
  }

  const { workout, items } = data;
  const inProgress = workout.endedAt === null;
  const totalSets = items.reduce((n, item) => n + item.sets.length, 0);

  const afterFinish = () => {
    router.dismissAll(); // back to Today
    const last = lastExportedAt();
    if (backupIsStale(last, nowUnix())) {
      Alert.alert(
        'Workout saved',
        `${last === null ? 'You have never backed up' : `Your last backup was ${formatDaysAgo(last, nowUnix())}`}. ` +
          'Your workouts live only on this phone.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Back up now', onPress: () => router.push(routes.backup()) },
        ],
      );
    }
  };

  const onFinish = () => {
    if (totalSets === 0) {
      Alert.alert('Nothing logged yet', 'Log at least one set to finish, or discard the workout.');
      return;
    }
    const empty = items.filter((item) => item.sets.length === 0);
    const removal =
      empty.length > 0
        ? `\n\n${empty.map((e) => e.exercise.name).join(', ')} ${empty.length === 1 ? 'has' : 'have'} no sets and will be removed.`
        : '';
    Alert.alert(
      'Finish workout?',
      `${plural(items.length - empty.length, 'exercise')} · ${plural(totalSets, 'set')}${removal}`,
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            const result = finishWorkout(db, workout.id);
            if (result.ok) afterFinish();
            else Alert.alert('Not finished', result.error);
          },
        },
      ],
    );
  };

  const onDiscard = () => {
    Alert.alert(
      'Discard this workout?',
      totalSets > 0 ? `All ${totalSets} logged sets will be deleted. This can’t be undone.` : 'This can’t be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            const result = discardWorkout(db, workout.id);
            if (result.ok) router.back();
            else Alert.alert('Not discarded', result.error);
          },
        },
      ],
    );
  };

  const onDeleteWorkout = () => {
    Alert.alert(
      'Delete this workout?',
      `${formatDate(workout.startedAt)}: ${plural(totalSets, 'set')} will be permanently deleted. ` +
        'If you might want it back, export a backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteWorkout(db, workout.id);
            if (result.ok) router.back();
            else Alert.alert('Not deleted', result.error);
          },
        },
      ],
    );
  };

  const onDoneEditing = () => {
    // A finished workout keeps only exercises that have sets, as when it was finished.
    const { setCount } = removeEmptyExercises(db, workout.id);
    if (setCount > 0) {
      setEditingPast(false);
      return;
    }
    Alert.alert('No sets left', 'This workout has no sets any more. Delete it?', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Delete workout',
        style: 'destructive',
        onPress: () => {
          deleteWorkout(db, workout.id);
          router.back();
        },
      },
    ]);
  };

  if (!inProgress && !editingPast) {
    return (
      <PastWorkoutDetail
        workout={workout}
        items={items}
        onEdit={() => setEditingPast(true)}
        onDelete={onDeleteWorkout}
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: inProgress ? 'Workout' : `Editing ${formatDate(workout.startedAt)}` }} />
      <Text style={[styles.meta, { color: c.textMuted }]}>
        Started {formatClock(workout.startedAt)} · {plural(items.length, 'exercise')} · {plural(totalSets, 'set')}
      </Text>

      {items.length === 0 ? (
        <Notice title="No exercises yet" body="Add the first exercise you're doing." />
      ) : (
        items.map((item, index) => (
          <Pressable
            key={item.workoutExercise.id}
            accessibilityRole="button"
            onPress={() => router.push(routes.workoutExercise(workout.id, item.workoutExercise.id))}
            style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.border : c.surface }]}>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                {index + 1}. {item.exercise.name}
              </Text>
              <Text style={[styles.cardBody, { color: c.textMuted }]} numberOfLines={2}>
                {item.sets.length === 0
                  ? 'No sets yet'
                  : `${plural(item.sets.length, 'set')}: ${item.sets
                      .map((s) => formatSet(s.weightKg, s.reps))
                      .join(', ')}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </Pressable>
        ))
      )}

      <Button title="Add exercise" onPress={() => router.push(routes.addExerciseToWorkout(workout.id))} />
      {inProgress ? (
        <>
          <Button title="Finish workout" onPress={onFinish} />
          <Button title="Discard workout" variant="danger" onPress={onDiscard} />
        </>
      ) : (
        <>
          <Button title="Done editing" onPress={onDoneEditing} />
          <Button title="Delete workout" variant="danger" onPress={onDeleteWorkout} />
        </>
      )}
    </Screen>
  );
}

/** "60 × 8 · RPE 8 · Warm-up". */
function describeSet(s: LoggedSet): string {
  return [
    formatSet(s.weightKg, s.reps),
    s.rpe !== null ? `RPE ${formatWeight(s.rpe)}` : null,
    s.setType !== 'working' ? SET_TYPE_LABELS[s.setType] : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * A finished workout, read-only, so browsing history can't change it by accident.
 * "Edit workout" switches the screen to the editable overview.
 */
function PastWorkoutDetail({
  workout,
  items,
  onEdit,
  onDelete,
}: {
  workout: Workout;
  items: WorkoutExerciseDetail[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = useColors();
  const totalSets = items.reduce((n, item) => n + item.sets.length, 0);
  const endedAt = workout.endedAt ?? workout.startedAt;
  return (
    <Screen>
      <Stack.Screen options={{ title: formatDate(workout.startedAt) }} />
      <Text style={[styles.meta, { color: c.textMuted }]}>
        {formatClock(workout.startedAt)}–{formatClock(endedAt)} · {formatDuration(endedAt - workout.startedAt)} ·{' '}
        {plural(items.length, 'exercise')} · {plural(totalSets, 'set')}
      </Text>
      {workout.notes ? <Text style={[styles.note, { color: c.text }]}>“{workout.notes}”</Text> : null}

      {items.map((item, index) => {
        const plan = describePlan({
          increaseWeight: item.workoutExercise.nextIncreaseWeight,
          increaseReps: item.workoutExercise.nextIncreaseReps,
        });
        return (
          <View key={item.workoutExercise.id} style={[styles.card, styles.detailCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>
              {index + 1}. {item.exercise.name}
            </Text>
            <Text style={[styles.cardUnit, { color: c.textMuted }]}>{loadLabel(item.exercise.equipment)}</Text>
            {item.sets.map((s, i) => (
              <Text key={s.id} style={[styles.setLine, { color: c.text }]}>
                {i + 1}.  {describeSet(s)}
              </Text>
            ))}
            {item.workoutExercise.notes ? (
              <Text style={[styles.note, { color: c.text }]}>“{item.workoutExercise.notes}”</Text>
            ) : null}
            {plan ? <Text style={[styles.cardUnit, { color: c.accent }]}>Next time: {plan}</Text> : null}
          </View>
        );
      })}

      <Button title="Edit workout" variant="secondary" onPress={onEdit} />
      <Button title="Delete workout" variant="danger" onPress={onDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: fontSize.body },
  card: {
    minHeight: TAP_TARGET + 16,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailCard: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.xs },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.large, fontWeight: '700' },
  cardBody: { fontSize: fontSize.body, fontVariant: ['tabular-nums'] },
  cardUnit: { fontSize: fontSize.small },
  setLine: { fontSize: fontSize.body, fontVariant: ['tabular-nums'] },
  note: { fontSize: fontSize.body, fontStyle: 'italic' },
});
