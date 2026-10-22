import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BackupStatusCard } from '@/components/backup-status-card';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { db } from '@/db/client';
import { sets, workoutExercises, workouts } from '@/db/schema';
import { formatClock, plural } from '@/domain/format';
import { useColors } from '@/hooks/use-colors';
import { useDbQuery } from '@/hooks/use-db-query';
import { getActiveWorkout, getWorkoutSummary, startWorkout } from '@/repo/workouts';
import { routes } from '@/routes';
import { fontSize, spacing } from '@/theme';

export default function TodayScreen() {
  const c = useColors();
  const active = useDbQuery(() => {
    const workout = getActiveWorkout(db);
    return workout ? { workout, summary: getWorkoutSummary(db, workout.id) } : null;
  }, [workouts, workoutExercises, sets]);

  const onStart = () => {
    const result = startWorkout(db);
    if (result.ok) router.push(routes.workout(result.value));
    else Alert.alert('Can’t start a workout', result.error);
  };

  return (
    <Screen>
      {active ? (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.accent }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Workout in progress</Text>
          <Text style={[styles.body, { color: c.textMuted }]}>
            Started {formatClock(active.workout.startedAt)} · {plural(active.summary.exerciseCount, 'exercise')} ·{' '}
            {plural(active.summary.setCount, 'set')}
          </Text>
          <Button title="Resume workout" onPress={() => router.push(routes.workout(active.workout.id))} />
        </View>
      ) : (
        <Button title="Start empty workout" onPress={onStart} />
      )}
      <BackupStatusCard />
      <Notice title="Coming later" body="Today's suggested split day arrives in M8." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 2, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: fontSize.large, fontWeight: '700' },
  body: { fontSize: fontSize.body },
});
