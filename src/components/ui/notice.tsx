import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { fontSize, spacing } from '@/theme';

/** A muted card with a short message, used for empty and not-built-yet screens. */
export function Notice({ title, body }: { title: string; body?: string }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {body ? <Text style={[styles.body, { color: c.textMuted }]}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  title: { fontSize: fontSize.body, fontWeight: '600' },
  body: { fontSize: fontSize.body },
});
