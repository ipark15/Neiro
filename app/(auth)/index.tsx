import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSize, spacing, radius, letterSpacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'KO', label: '한국어' },
  { code: 'JA', label: '日本語' },
  { code: 'ES', label: 'Español' },
  { code: 'FR', label: 'Français' },
  { code: 'PT', label: 'Português' },
  { code: 'DE', label: 'Deutsch' },
];

const INNER_RADIUS = 52;
const OUTER_RADIUS = 80;

const INNER_DOTS = [
  { angle: 0, color: colors.lang.EN },
  { angle: 120, color: colors.lang.KO },
  { angle: 240, color: colors.lang.JA },
];

const OUTER_DOTS = [
  { angle: 60, color: colors.lang.ES },
  { angle: 180, color: colors.lang.FR },
  { angle: 300, color: colors.lang.DE },
];

function OrbitalDot({
  angle,
  ringRadius,
  dotColor,
  counter,
}: {
  angle: number;
  ringRadius: number;
  dotColor: string;
  counter: Animated.AnimatedInterpolation<string>;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * ringRadius;
  const y = Math.sin(rad) * ringRadius;

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: dotColor },
        { transform: [{ translateX: x }, { translateY: y }, { rotate: counter }] },
      ]}
    />
  );
}

function Orbital() {
  const innerRot = useRef(new Animated.Value(0)).current;
  const outerRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(innerRot, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    Animated.loop(
      Animated.timing(outerRot, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [innerRot, outerRot]);

  const innerSpin = innerRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const outerSpin = outerRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const innerCounter = innerRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const outerCounter = outerRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={styles.orbital}>
      <View style={[styles.ring, { width: INNER_RADIUS * 2, height: INNER_RADIUS * 2, borderRadius: INNER_RADIUS }]} />
      <View style={[styles.ring, { width: OUTER_RADIUS * 2, height: OUTER_RADIUS * 2, borderRadius: OUTER_RADIUS }]} />

      <View style={styles.center} />

      <Animated.View style={[styles.ringDots, { transform: [{ rotate: innerSpin }] }]}>
        {INNER_DOTS.map((d) => (
          <OrbitalDot key={d.angle} angle={d.angle} ringRadius={INNER_RADIUS} dotColor={d.color} counter={innerCounter} />
        ))}
      </Animated.View>

      <Animated.View style={[styles.ringDots, { transform: [{ rotate: outerSpin }] }]}>
        {OUTER_DOTS.map((d) => (
          <OrbitalDot key={d.angle} angle={d.angle} ringRadius={OUTER_RADIUS} dotColor={d.color} counter={outerCounter} />
        ))}
      </Animated.View>
    </View>
  );
}

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>A VOICE DIARY</Text>
        <Text style={styles.topBrand}>
          Neiro <Text style={styles.topKanji}>音色</Text>
        </Text>
      </View>

      <View style={styles.hero}>
        <Orbital />

        <Text style={styles.headline}>Speak your day,{'\n'}
          <Text style={styles.headlineItalic}>in any tongue.</Text>
        </Text>
        <Text style={styles.subheadline}>
          A voice journal for people who think in{'\n'}more than one language. Press a button,{'\n'}talk to your day.
        </Text>
      </View>

      <View style={styles.langBox}>
        <View style={styles.langHeader}>
          <Text style={styles.langLabel}>LANGUAGES</Text>
          <Text style={styles.langCount}>{LANGUAGES.length} / {LANGUAGES.length}</Text>
        </View>
        <View style={styles.langGrid}>
          {LANGUAGES.map(({ code, label }) => (
            <View key={code} style={styles.langChip}>
              <View style={[styles.langDot, { backgroundColor: colors.lang[code] }]} />
              <Text style={styles.langChipText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/login?mode=signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Begin journaling  →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login?mode=signin')}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>

        <Text style={styles.syncNote}>↻  Kept across all your devices</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  topLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: letterSpacing.wide,
  },
  topBrand: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  topKanji: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  orbital: {
    width: OUTER_RADIUS * 2 + 20,
    height: OUTER_RADIUS * 2 + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ringDots: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  center: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.terracotta,
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 42,
  },
  headlineItalic: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
  },
  subheadline: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  langBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.bgCard,
  },
  langHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  langLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: letterSpacing.wide,
  },
  langCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    minWidth: (width - spacing.lg * 2 - spacing.md * 2 - spacing.sm * 3) / 4,
  },
  langDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  langChipText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.md,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.bgDark,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.base,
    color: colors.bgCard,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  syncNote: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
