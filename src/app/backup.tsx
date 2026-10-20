import * as DocumentPicker from 'expo-document-picker';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import type { ParsedBackup } from '@/domain/backup-format';
import { describeCounts, formatDateTime, formatDaysAgo } from '@/domain/format';
import { nowUnix } from '@/domain/time';
import { useColors } from '@/hooks/use-colors';
import { useReloadData } from '@/hooks/use-reload-data';
import { createBackupFile, currentCounts, lastExportedAt, markExported, readBackup, restoreBackup } from '@/repo/backup';
import { fontSize, spacing } from '@/theme';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function BackupScreen() {
  const c = useColors();
  const reloadData = useReloadData();
  const [busy, setBusy] = useState<'export' | 'restore' | null>(null);
  const [lastExport, setLastExport] = useState(() => lastExportedAt());
  const counts = currentCounts();

  const onExport = async () => {
    setBusy('export');
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Can’t export', 'Sharing isn’t available on this device.');
        return;
      }
      const { file, manifest } = await createBackupFile();
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/zip',
        UTI: 'public.zip-archive',
        dialogTitle: 'Save backup',
      });
      // The share sheet doesn't report whether a copy was actually saved.
      markExported(manifest.createdAt);
      setLastExport(manifest.createdAt);
    } catch (e) {
      Alert.alert('Export failed', message(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmAndRestore = (backup: ParsedBackup) => {
    const m = backup.manifest;
    Alert.alert(
      'Replace all data?',
      `Backup from ${formatDateTime(m.createdAt)}:\n${describeCounts(m.counts)}\n\n` +
        `Now on this phone:\n${describeCounts(counts)}\n\n` +
        'Everything on this phone is replaced. A safety copy of the current data is kept on the phone first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            setBusy('restore');
            try {
              const result = await restoreBackup(backup);
              if (result.ok) {
                Alert.alert('Restored', `Your data is now the backup from ${formatDateTime(m.createdAt)}.`, [
                  { text: 'OK', onPress: reloadData },
                ]);
              } else {
                Alert.alert('Restore failed', result.error);
              }
            } catch (e) {
              Alert.alert('Restore failed', message(e));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const onRestore = async () => {
    // Any file type: the backup is checked thoroughly before anything changes, and a
    // stricter filter risks greying out a valid backup in the Files app.
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (picked.canceled) return;
    setBusy('restore');
    try {
      const backup = await readBackup(picked.assets[0].uri);
      if (backup.ok) confirmAndRestore(backup.value);
      else Alert.alert('Can’t restore this file', backup.error);
    } catch (e) {
      Alert.alert('Can’t restore this file', message(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Backup & restore' }} />

      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>
          {lastExport === null ? 'Never backed up' : `Last backup ${formatDaysAgo(lastExport, nowUnix())}`}
        </Text>
        {lastExport !== null ? (
          <Text style={[styles.body, { color: c.textMuted }]}>{formatDateTime(lastExport)}</Text>
        ) : null}
        <Text style={[styles.body, { color: c.textMuted }]}>On this phone: {describeCounts(counts)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: c.textMuted }]}>Export</Text>
        <Text style={[styles.body, { color: c.text }]}>
          All your data lives only inside Expo Go on this phone. Deleting Expo Go deletes it. Export a backup
          regularly: in the share sheet choose <Text style={styles.bold}>Save to Files</Text>, then a folder in{' '}
          <Text style={styles.bold}>iCloud Drive</Text>.
        </Text>
        <Button title="Export backup" onPress={onExport} disabled={busy !== null} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.heading, { color: c.textMuted }]}>Restore</Text>
        <Text style={[styles.body, { color: c.text }]}>
          Replaces everything on this phone with a backup file. The backup is checked first, and a safety copy of
          the current data is kept.
        </Text>
        <Button title="Restore from backup…" variant="secondary" onPress={onRestore} disabled={busy !== null} />
      </View>

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator />
          <Text style={[styles.body, { color: c.textMuted }]}>
            {busy === 'export' ? 'Preparing backup…' : 'Working on the backup…'}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  cardTitle: { fontSize: fontSize.large, fontWeight: '700' },
  section: { gap: spacing.sm },
  heading: { fontSize: fontSize.small, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: fontSize.body },
  bold: { fontWeight: '700' },
  busy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
