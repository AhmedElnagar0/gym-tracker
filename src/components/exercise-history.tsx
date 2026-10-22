import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, formatSet } from '@/domain/format';
import { useColors } from '@/hooks/use-colors';
import type { LastPerformance } from '@/repo/history';
import { routes } from '@/routes';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

import { Notice } from './ui/notice';

/** Every finished session of one exercise, newest first. Tap one to open that workout. */
export function ExerciseHistory({ sessions, hasVariants }: { sessions: LastPerformance[]; hasVariants: boolean }) {
  const c = useColors();
  const variantNote = hasVariants ? ' Its variants have their own history.' : '';

  if (sessions.length === 0) {
    return <Notice title="Not done yet" body={`Finished workouts with this exercise appear here.${variantNote}`} />;
  }

  return (
    <View style={styles.list}>
      {hasVariants ? <Text style={[styles.hint, { color: c.textMuted }]}>{variantNote.trim()}</Text> : null}
      {sessions.map(({ workout, workoutExercise, sets }) => (
        <Pressable
          key={workoutExercise.id}
          accessibilityRole="button"
          onPress={() => router.push(routes.workout(workout.id))}
          style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.border : c.surface }]}>
          <View style={styles.text}>
            <Text style={[styles.date, { color: c.text }]}>{formatDate(workout.startedAt)}</Text>
            <Text style={[styles.sets, { color: c.text }]}>
              {sets.map((s) => formatSet(s.weightKg, s.reps)).join(', ')}
            </Text>
            {workoutExercise.notes ? (
              <Text style={[styles.note, { color: c.textMuted }]}>“{workoutExercise.notes}”</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  hint: { fontSize: fontSize.small },
  card: {
    minHeight: TAP_TARGET,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: { flex: 1, gap: 2 },
  date: { fontSize: fontSize.body, fontWeight: '700' },
  sets: { fontSize: fontSize.body, fontVariant: ['tabular-nums'] },
  note: { fontSize: fontSize.body, fontStyle: 'italic' },
});
