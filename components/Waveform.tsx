import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface WaveformProps {
  active: boolean;
  amplitudes?: number[];
}

export default function Waveform({ active, amplitudes = [] }: WaveformProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: 32 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: amplitudes[i] ? amplitudes[i] * 40 + 4 : 4 },
            active && styles.barActive,
          ]}
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
