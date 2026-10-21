import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme';

import { dismissKeyboardOnScroll } from './keyboard';

/** Scrollable page body with the standard background and padding. */
export function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      {...dismissKeyboardOnScroll}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
});
