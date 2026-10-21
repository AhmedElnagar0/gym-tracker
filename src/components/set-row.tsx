import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatSet, formatWeight } from '@/domain/format';
import { SET_TYPE_LABELS } from '@/domain/set-input';
import { useColors } from '@/hooks/use-colors';
import type { LoggedSet } from '@/repo/workout-exercises';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

/** One logged set: "1   60 × 8   RPE 8   Warm-up". Tap to edit. */
export function SetRow({
  number,
  set,
  selected,
  onPress,
}: {
  number: number;
  set: LoggedSet;
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
        { backgroundColor: selected ? c.surface : pressed ? c.surface : c.background, borderColor: selected ? c.accent : c.border },
      ]}>
      <Text style={[styles.number, { color: c.textMuted }]}>{number}</Text>
      <Text style={[styles.value, { color: c.text }]}>{formatSet(set.weightKg, set.reps)}</Text>
      <View style={styles.tags}>
        <Text style={[styles.tagText, { color: c.textMuted }]} numberOfLines={1}>
          {tags}
        </Text>
      </View>
      <Ionicons name="create-outline" size={20} color={c.textMuted} />
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
    borderRadius: 12,
    borderWidth: 1,
  },
  number: { width: 24, fontSize: fontSize.body, fontVariant: ['tabular-nums'] },
  value: { fontSize: fontSize.large, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tags: { flex: 1, alignItems: 'flex-end' },
  tagText: { fontSize: fontSize.small },
});
