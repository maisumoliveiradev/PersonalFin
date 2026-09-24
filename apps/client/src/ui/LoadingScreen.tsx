import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { messages } from '../i18n/messages';
import { usePalette } from './theme';

export function LoadingScreen() {
  const palette = usePalette();
  return (
    <View
      accessibilityLabel={messages.common.loading}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <ActivityIndicator color={palette.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
