import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { fontSize, radius, spacing, usePalette } from './theme';

type ButtonVariant = 'primary' | 'danger' | 'link';

interface ButtonProps {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const palette = usePalette();
  const isFilled = variant !== 'link';
  const isInactive = disabled || loading;
  const fillColor = variant === 'danger' ? palette.danger : palette.primary;
  const contentColor = isFilled ? palette.onPrimary : palette.primary;
  return (
    <Pressable
      role="button"
      aria-label={accessibilityLabel ?? label}
      aria-disabled={isInactive}
      aria-busy={loading}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isFilled && { backgroundColor: fillColor },
        (pressed || isInactive) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <Text style={[styles.label, { color: contentColor }, !isFilled && styles.linkLabel]}>
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
