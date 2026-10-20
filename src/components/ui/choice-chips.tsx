import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { fontSize, spacing } from '@/theme';

export type Choice<T extends string> = { value: T; label: string };

/** A wrapping row of single-choice chips. */
export function ChoiceChips<T extends string>({
  choices,
  value,
  onChange,
  disabled = false,
}: {
  choices: readonly Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.row}>
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(choice.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? c.accent : c.surface,
                borderColor: selected ? c.accent : c.border,
                opacity: disabled && !selected ? 0.4 : 1,
              },
            ]}>
            <Text style={[styles.label, { color: selected ? '#FFFFFF' : c.text }]}>{choice.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
  },
  label: { fontSize: fontSize.body },
});
