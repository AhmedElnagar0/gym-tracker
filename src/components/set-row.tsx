import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatSet, formatWeight } from '@/domain/format';
import { SET_TYPE_LABELS } from '@/domain/set-input';
import { useColors } from '@/hooks/use-colors';
import type { LoggedSet } from '@/repo/workout-exercises';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

type LastTime = { weightKg: number; reps: number } | undefined;

/** One logged set: "1   60 × 8   RPE 8   Warm-up", with last time's set beneath. Tap to edit. */
export function SetRow({
  number,
  set,
  lastTime,
  selected,
  onPress,
}: {
  number: number;
  set: LoggedSet;
  lastTime: LastTime;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const tags = [set.rpe !== null ? `RPE ${formatWeight(set.rpe)}` : null, set.setType !== 'working' ? SET_TYPE_LABELS[set.setType] : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Set ${number}: ${formatSet(set.weightKg, set.reps)}. Tap to edit.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: selected || pressed ? c.surface : c.background, borderColor: selected ? c.accent : c.border },
      ]}>
      <Text style={[styles.number, { color: c.textMuted }]}>{number}</Text>
      <View style={styles.values}>
        <Text style={[styles.value, { color: c.text }]}>{formatSet(set.weightKg, set.reps)}</Text>
        {lastTime ? (
          <Text style={[styles.last, { color: c.textMuted }]}>last time {formatSet(lastTime.weightKg, lastTime.reps)}</Text>
        ) : null}
      </View>
      <Text style={[styles.tags, { color: c.textMuted }]} numberOfLines={1}>
        {tags}
      </Text>
      <Ionicons name="create-outline" size={20} color={c.textMuted} />
    </Pressable>
  );
}

/** A set done last time but not yet this time: shows last time's numbers, tap to log it. */
export function PendingSetRow({ number, lastTime, onPress }: { number: number; lastTime: NonNullable<LastTime>; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Set ${number}, not logged yet. Last time ${formatSet(lastTime.weightKg, lastTime.reps)}. Tap to log.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        styles.pending,
        { backgroundColor: pressed ? c.surface : c.background, borderColor: c.border },
      ]}>
      <Text style={[styles.number, { color: c.textMuted }]}>{number}</Text>
      <View style={[styles.values, styles.grow]}>
        <Text style={[styles.value, { color: c.textMuted }]}>–</Text>
        <Text style={[styles.last, { color: c.textMuted }]}>last time {formatSet(lastTime.weightKg, lastTime.reps)}</Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={c.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  pending: { borderStyle: 'dashed' },
  number: { width: 24, fontSize: fontSize.body, fontVariant: ['tabular-nums'] },
  values: { gap: 2 },
  grow: { flex: 1 },
  value: { fontSize: fontSize.large, fontWeight: '700', fontVariant: ['tabular-nums'] },
  last: { fontSize: fontSize.small, fontVariant: ['tabular-nums'] },
  tags: { flex: 1, textAlign: 'right', fontSize: fontSize.small },
});
