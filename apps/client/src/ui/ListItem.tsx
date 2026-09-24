import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, radius, spacing, usePalette } from './theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  accessibilityHint?: string;
  onPress: () => void;
}

export function ListItem({ title, subtitle, accessibilityHint, onPress }: ListItemProps) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.texts}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {subtitle !== undefined && (
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      <Text style={[styles.chevron, { color: palette.textMuted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.body, fontWeight: '600' },
  subtitle: { fontSize: fontSize.caption },
  chevron: { fontSize: fontSize.title },
});
