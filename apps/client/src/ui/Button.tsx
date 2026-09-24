import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { fontSize, radius, spacing, usePalette } from './theme';

type ButtonVariant = 'primary' | 'link';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const palette = usePalette();
  const isPrimary = variant === 'primary';
  const isInactive = disabled || loading;
  const contentColor = isPrimary ? palette.onPrimary : palette.primary;
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={isInactive}
      aria-busy={loading}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary && { backgroundColor: palette.primary },
        (pressed || isInactive) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <Text style={[styles.label, { color: contentColor }, !isPrimary && styles.linkLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dimmed: { opacity: 0.6 },
  label: { fontSize: fontSize.body, fontWeight: '600' },
  linkLabel: { textDecorationLine: 'underline' },
});
