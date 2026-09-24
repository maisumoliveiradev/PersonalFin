import { formatMonthLabel, type Month, shiftMonth } from '@personalfin/domain';
import { StyleSheet, Text, View } from 'react-native';

import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { fontSize, spacing, usePalette } from '../../ui/theme';

interface MonthNavigatorProps {
  month: Month;
  onChange: (month: Month) => void;
}

export function MonthNavigator({ month, onChange }: MonthNavigatorProps) {
  const palette = usePalette();
  const label = formatMonthLabel(month, 'pt-BR');
  return (
    <View style={styles.row}>
      <Button
        label="‹"
        accessibilityLabel={messages.transactions.previousMonth}
        variant="link"
        onPress={() => onChange(shiftMonth(month, -1))}
      />
      <Text role="heading" aria-live="polite" style={[styles.label, { color: palette.text }]}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
      <Button
        label="›"
        accessibilityLabel={messages.transactions.nextMonth}
        variant="link"
        onPress={() => onChange(shiftMonth(month, 1))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: { flex: 1, textAlign: 'center', fontSize: fontSize.body + 2, fontWeight: '700' },
});
