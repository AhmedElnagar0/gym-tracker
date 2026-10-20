import { Pressable, StyleSheet, Text } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { fontSize, spacing, TAP_TARGET } from '@/theme';

type Variant = 'primary' | 'secondary' | 'danger';

/** Full-width button with a gym-friendly tap target. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}) {
  const c = useColors();
  const background = variant === 'primary' ? c.accent : c.surface;
  const color = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.title, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TAP_TARGET,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize.body, fontWeight: '600' },
});
