import { StyleSheet, Text } from 'react-native';

import { fontSize, radius, spacing, usePalette } from './theme';

interface StatusMessageProps {
  children: string;
}

export function StatusMessage({ children }: StatusMessageProps) {
  const palette = usePalette();
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.message,
        { color: palette.success, backgroundColor: palette.surface, borderColor: palette.success },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: fontSize.body,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
});
