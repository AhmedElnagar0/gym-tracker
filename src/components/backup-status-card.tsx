import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { backupIsStale, formatDaysAgo } from '@/domain/format';
import { nowUnix } from '@/domain/time';
import { useColors } from '@/hooks/use-colors';
import { lastExportedAt } from '@/repo/backup';
import { routes } from '@/routes';
import { fontSize, spacing } from '@/theme';

import { Button } from './ui/button';

/** "Last backup: 3 days ago" with a link to Backup & restore; highlighted when overdue. */
export function BackupStatusCard() {
  const c = useColors();
  const [lastExport, setLastExport] = useState<number | null>(() => lastExportedAt());

  // Re-read when Today comes back into view, e.g. after exporting.
  useFocusEffect(
    useCallback(() => {
      setLastExport(lastExportedAt());
    }, []),
  );

  const now = nowUnix();
  const stale = backupIsStale(lastExport, now);
  const text = lastExport === null ? 'Never backed up' : `Last backup ${formatDaysAgo(lastExport, now)}`;

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: stale ? c.danger : c.surface }]}>
      <Text style={[styles.title, { color: stale ? c.danger : c.text }]}>{text}</Text>
      {stale ? (
        <Text style={[styles.body, { color: c.textMuted }]}>
          Your data is only on this phone. Export a backup to iCloud Drive.
        </Text>
      ) : null}
      <Button title="Backup & restore" variant="secondary" onPress={() => router.push(routes.backup())} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 2, padding: spacing.md, gap: spacing.sm },
  title: { fontSize: fontSize.body, fontWeight: '700' },
  body: { fontSize: fontSize.body },
});
