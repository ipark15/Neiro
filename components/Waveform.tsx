import { Animated, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface WaveformProps {
  active: boolean;
  bars: Animated.Value[];
}

export default function Waveform({ active, bars }: WaveformProps) {
  return (
    <View style={styles.container}>
      {bars.map((height, i) => (
        <Animated.View
          key={i}
          style={[styles.bar, { height }, active && styles.barActive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 48,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  barActive: {
    backgroundColor: colors.terracotta,
  },
});
