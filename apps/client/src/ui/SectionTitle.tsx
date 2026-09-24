import { StyleSheet, Text } from 'react-native';

import { fontSize, usePalette } from './theme';

interface SectionTitleProps {
  children: string;
}

export function SectionTitle({ children }: SectionTitleProps) {
  const palette = usePalette();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.body + 2, fontWeight: '700' },
});
