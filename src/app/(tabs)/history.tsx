import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Notice } from '@/components/ui/notice';
import { db } from '@/db/client';
import { exercises, sets, workoutExercises, workouts } from '@/db/schema';
import { formatClock, formatDate, formatDuration, groupByMonth, plural } from '@/domain/format';
import { useColors } from '@/hooks/use-colors';
import { useDbQuery } from '@/hooks/use-db-query';
import { listFinishedWorkouts, type WorkoutListItem } from '@/repo/history';
import { routes } from '@/routes';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

/** "Bench Press, Back Squat, Leg Curl +2 more". */
function exerciseSummary(names: string[]): string {
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
}

export default function HistoryScreen() {
  const c = useColors();
  const sections = useDbQuery(
    () => groupByMonth(listFinishedWorkouts(db), (item) => item.workout.startedAt),
    [workouts, workoutExercises, sets, exercises],
  );

  return (
    <SectionList<WorkoutListItem>
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(item) => item.workout.id}
      ListEmptyComponent={
        <Notice title="No workouts yet" body="Finished workouts appear here, newest first." />
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.month, { color: c.text, backgroundColor: c.background }]}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        const { workout } = item;
        const duration = workout.endedAt !== null ? formatDuration(workout.endedAt - workout.startedAt) : '';
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.workout(workout.id))}
            style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.border : c.surface }]}>
            <View style={styles.text}>
              <Text style={[styles.date, { color: c.text }]}>{formatDate(workout.startedAt)}</Text>
              <Text style={[styles.meta, { color: c.textMuted }]}>
                {formatClock(workout.startedAt)} · {duration} · {plural(item.setCount, 'set')}
              </Text>
              <Text style={[styles.names, { color: c.text }]} numberOfLines={2}>
                {exerciseSummary(item.exerciseNames)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm },
  month: { fontSize: fontSize.large, fontWeight: '700', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  row: {
    minHeight: TAP_TARGET + 16,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: { flex: 1, gap: 2 },
  date: { fontSize: fontSize.body, fontWeight: '700' },
  meta: { fontSize: fontSize.small, fontVariant: ['tabular-nums'] },
  names: { fontSize: fontSize.body },
});
