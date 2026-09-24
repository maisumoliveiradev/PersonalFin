import { StyleSheet, Text } from 'react-native';

import { fontSize, usePalette } from './theme';

interface TitleProps {
  children: string;
}

export function Title({ children }: TitleProps) {
  const palette = usePalette();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.title, fontWeight: '700' },
});
