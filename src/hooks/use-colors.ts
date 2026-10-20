import { useColorScheme } from 'react-native';

import { colors, type Palette } from '@/theme';

/** The palette for the phone's current light/dark setting. */
export function useColors(): Palette {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}
