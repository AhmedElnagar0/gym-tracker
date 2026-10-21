import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { KeypadKey } from '@/domain/keypad';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme';

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

/** Large on-screen number pad. Long-press ⌫ to clear. */
export function NumberPad({ onKey, allowDecimal }: { onKey: (key: KeypadKey) => void; allowDecimal: boolean }) {
  const c = useColors();
  return (
    <View style={styles.pad}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            const disabled = key === '.' && !allowDecimal;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === 'backspace' ? 'Delete' : key === '.' ? 'Decimal point' : key}
                disabled={disabled}
                onPress={() => onKey(key)}
                onLongPress={key === 'backspace' ? () => onKey('clear') : undefined}
                style={({ pressed }) => [
                  styles.key,
                  { backgroundColor: pressed ? c.border : c.surface, opacity: disabled ? 0.3 : 1 },
                ]}>
                {key === 'backspace' ? (
                  <Ionicons name="backspace-outline" size={28} color={c.text} />
                ) : (
                  <Text style={[styles.label, { color: c.text }]}>{key}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  key: { flex: 1, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 28, fontWeight: '500' },
});
