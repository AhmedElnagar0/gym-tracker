import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { db } from '@/db/client';
import { exercises, sets, workoutExercises, workouts } from '@/db/schema';
import { backupIsStale, formatClock, formatDaysAgo, formatSet, plural } from '@/domain/format';
import { nowUnix } from '@/domain/time';
import { useColors } from '@/hooks/use-colors';
import { useDbQuery } from '@/hooks/use-db-query';
import { lastExportedAt } from '@/repo/backup';
import { listWorkoutExercises } from '@/repo/workout-exercises';
import { discardWorkout, finishWorkout, getWorkout } from '@/repo/workouts';
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

  if (!data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Notice title="Workout not found" body="It may have been discarded." />
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

  return (
    <Screen>
      <Stack.Screen options={{ title: inProgress ? 'Workout' : 'Past workout' }} />
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
      ) : null}
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
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.large, fontWeight: '700' },
  cardBody: { fontSize: fontSize.body, fontVariant: ['tabular-nums'] },
});
