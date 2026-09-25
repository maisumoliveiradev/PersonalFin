import { StyleSheet, View } from 'react-native';

import { usePalette } from './theme';

interface ProgressBarProps {
  label: string;
  tenths: number;
}

export function ProgressBar({ label, tenths }: ProgressBarProps) {
  const palette = usePalette();
  const clamped = Math.min(Math.max(tenths, 0), 1000);
  return (
    <View
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(clamped / 10)}
      style={[styles.track, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View
        style={[styles.fill, { backgroundColor: palette.primary, width: `${clamped / 10}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, borderWidth: 1, overflow: 'hidden' },
  fill: { height: '100%' },
});
