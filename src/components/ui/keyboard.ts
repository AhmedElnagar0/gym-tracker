import { Keyboard, type ScrollViewProps } from 'react-native';

/**
 * Spread onto every vertical ScrollView / SectionList that contains a text field:
 * starting to drag hides the keyboard, and taps on buttons still go through.
 *
 * iOS's own `keyboardDismissMode="on-drag"` only fires when the content actually
 * scrolls, so a short list (e.g. a search with two results) kept the keyboard up.
 * Always bouncing plus dismissing on drag start covers that case.
 */
export const dismissKeyboardOnScroll = {
  keyboardDismissMode: 'on-drag',
  keyboardShouldPersistTaps: 'handled',
  alwaysBounceVertical: true,
  onScrollBeginDrag: () => Keyboard.dismiss(),
} satisfies Partial<ScrollViewProps>;
