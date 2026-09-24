import { StyleSheet, Text } from 'react-native';

import { fontSize, usePalette } from './theme';

interface BodyTextProps {
  children: string;
  muted?: boolean;
}

export function BodyText({ children, muted = false }: BodyTextProps) {
  const palette = usePalette();
  return (
    <Text style={[styles.body, { color: muted ? palette.textMuted : palette.text }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: fontSize.body, lineHeight: 22 },
});
