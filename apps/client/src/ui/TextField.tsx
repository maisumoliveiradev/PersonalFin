import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { fontSize, radius, spacing, usePalette } from './theme';

interface TextFieldProps
  extends Pick<
    TextInputProps,
    'autoComplete' | 'keyboardType' | 'secureTextEntry' | 'textContentType' | 'onSubmitEditing'
  > {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
}

export function TextField({ label, value, onChangeText, hint, ...inputProps }: TextFieldProps) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={hint}
        autoCapitalize="none"
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      />
      {hint !== undefined && (
        <Text style={[styles.hint, { color: palette.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.caption, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.body,
    minHeight: 48,
  },
  hint: { fontSize: fontSize.caption },
});
