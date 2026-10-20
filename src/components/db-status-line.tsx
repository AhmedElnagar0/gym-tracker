import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { type DbStatus, getDbStatus } from '@/repo/debug';
import { fontSize } from '@/theme';

/** Temporary (M0–M5): proves the database is set up correctly on the phone. */
export function DbStatusLine() {
  const c = useColors();
  const [status, setStatus] = useState<DbStatus | null>(null);

  // Re-read whenever this screen comes into view.
  useFocusEffect(
    useCallback(() => {
      setStatus(getDbStatus());
    }, []),
  );

  if (!status) return null;
  const healthy = status.foreignKeys && status.migrationsApplied === status.migrationsTotal;
  const text = [
    healthy ? 'DB ok' : 'DB PROBLEM',
    status.foreignKeys ? 'FK on' : 'FK OFF',
    `${status.exercises} exercises`,
    `${status.workouts} workouts`,
    `${status.sets} sets`,
    `migrations ${status.migrationsApplied}/${status.migrationsTotal}`,
  ].join(' · ');

  return <Text style={[styles.line, { color: healthy ? c.ok : c.danger }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  line: { fontSize: fontSize.small, fontVariant: ['tabular-nums'] },
});
