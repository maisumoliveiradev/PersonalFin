import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Option } from './OptionGroup';
import { fontSize, radius, spacing, usePalette } from './theme';

interface CheckboxGroupProps<Value extends string> {
  label: string;
  options: readonly Option<Value>[];
  selected: readonly Value[];
  onToggle: (value: Value) => void;
}

export function CheckboxGroup<Value extends string>({
  label,
  options,
  selected,
  onToggle,
}: CheckboxGroupProps<Value>) {
  const palette = usePalette();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View role="group" aria-label={label} style={styles.options}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={option.label}
              onPress={() => onToggle(option.value)}
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
