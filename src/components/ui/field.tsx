import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { fontSize, spacing } from '@/theme';

/** A labelled form field with an optional hint and error message. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[styles.note, { color: c.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.note, { color: c.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontSize: fontSize.small, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  note: { fontSize: fontSize.small },
});
