import { StyleSheet, Text } from 'react-native';

import { fontSize, usePalette } from './theme';

interface FormErrorProps {
  message: string | null;
}

export function FormError({ message }: FormErrorProps) {
  const palette = usePalette();
  if (message === null) {
    return null;
  }
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.error, { color: palette.danger }]}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: fontSize.caption, fontWeight: '600' },
});
