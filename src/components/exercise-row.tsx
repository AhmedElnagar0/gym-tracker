import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '@/db/schema';
import { EQUIPMENT_LABELS } from '@/domain/constants';
import { useColors } from '@/hooks/use-colors';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

/** One exercise in a list. Variants are indented under their parent. */
export function ExerciseRow({
  exercise,
  isVariant,
  onPress,
}: {
  exercise: Exercise;
  isVariant: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const details = [
    EQUIPMENT_LABELS[exercise.equipment],
    exercise.isUnilateral ? 'one side at a time' : null,
    exercise.archivedAt !== null ? 'archived' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? c.surface : c.background, paddingLeft: isVariant ? spacing.xl + spacing.md : spacing.md },
      ]}>
      <View style={styles.text}>
        <Text
          style={[styles.name, { color: exercise.archivedAt !== null ? c.textMuted : c.text }]}
          numberOfLines={1}>
          {isVariant ? `↳ ${exercise.name}` : exercise.name}
        </Text>
        <Text style={[styles.details, { color: c.textMuted }]} numberOfLines={1}>
          {details}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body },
  details: { fontSize: fontSize.small },
});
