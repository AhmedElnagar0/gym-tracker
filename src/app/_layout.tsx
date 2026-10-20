import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { initDatabase } from '@/db/init';
import { useColors } from '@/hooks/use-colors';
import { ReloadDataContext } from '@/hooks/use-reload-data';
import { fontSize, spacing } from '@/theme';

// Keep the splash screen up until the database is ready, so no screen can query it early.
SplashScreen.preventAutoHideAsync();

type InitState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; error: Error };

export default function RootLayout() {
  const scheme = useColorScheme();
  const [state, setState] = useState<InitState>({ status: 'loading' });
  // Changing the navigator's key remounts every screen (used after a restore).
  const [generation, setGeneration] = useState(0);
  const reloadData = useCallback(() => setGeneration((g) => g + 1), []);

  useEffect(() => {
    initDatabase()
      .then(() => setState({ status: 'ready' }))
      .catch((e: unknown) =>
        setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) }),
      )
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <DatabaseError error={state.error} />;

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ReloadDataContext.Provider value={reloadData}>
        <StatusBar style="auto" />
        <Stack key={generation}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ReloadDataContext.Provider>
    </ThemeProvider>
  );
}

function DatabaseError({ error }: { error: Error }) {
  const c = useColors();
  return (
    <View style={[styles.error, { backgroundColor: c.background }]}>
      <Text style={[styles.errorTitle, { color: c.danger }]}>The database could not be opened</Text>
      <Text style={{ color: c.text, fontSize: fontSize.body }}>{error.message}</Text>
      <Text style={{ color: c.textMuted, fontSize: fontSize.body }}>
        Nothing has been deleted. Don&apos;t reinstall Expo Go: that would erase your data. Send this
        message to whoever maintains the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  errorTitle: { fontSize: fontSize.large, fontWeight: '700' },
});
