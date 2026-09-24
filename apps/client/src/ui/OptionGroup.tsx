import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, radius, spacing, usePalette } from './theme';

export interface Option<Value extends string> {
  value: Value;
  label: string;
}

interface OptionGroupProps<Value extends string> {
  label: string;
  options: readonly Option<Value>[];
  selected: Value | null;
  onSelect: (value: Value) => void;
}

export function OptionGroup<Value extends string>({
  label,
  options,
  selected,
  onSelect,
}: OptionGroupProps<Value>) {
  const palette = usePalette();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View role="radiogroup" aria-label={label} style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              onPress={() => onSelect(option.value)}
              style={[
                styles.option,
                { borderColor: isSelected ? palette.primary : palette.border },
                isSelected && { backgroundColor: palette.primary },
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  { color: isSelected ? palette.onPrimary : palette.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { fontSize: fontSize.caption, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  optionLabel: { fontSize: fontSize.body },
});
