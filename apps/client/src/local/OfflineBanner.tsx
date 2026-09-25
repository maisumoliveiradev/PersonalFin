import { StyleSheet, Text, View } from 'react-native';

import { messages } from '../i18n/messages';
import { fontSize, spacing, usePalette } from '../ui/theme';
import { useIsOnline } from './connectivity';

export function OfflineBanner() {
  const palette = usePalette();
  const online = useIsOnline();
  if (online) {
    return null;
  }
  return (
    <View
      role="status"
      aria-live="polite"
      style={[
        styles.banner,
        { backgroundColor: palette.warningSurface, borderColor: palette.warning },
      ]}
    >
      <Text style={[styles.text, { color: palette.warning }]}>{messages.offline.banner}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: { fontSize: fontSize.caption, fontWeight: '600', textAlign: 'center' },
});
