import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, letterSpacing } from '@/constants/theme';

function RecordIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.recordRing, focused && styles.recordRingActive]}>
      <View style={[styles.recordDot, focused && styles.recordDotActive]} />
    </View>
  );
}

function CalendarIcon({ focused }: { focused: boolean }) {
  const c = focused ? colors.terracotta : colors.textSecondary;
  return (
    <View style={[styles.calWrap, { borderColor: c }]}>
      <View style={[styles.calHeader, { backgroundColor: c }]} />
      <View style={styles.calGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.calDot, { backgroundColor: c }]} />
        ))}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.terracotta,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="record"
        options={{
          title: 'RECORD',
          tabBarIcon: ({ focused }) => <RecordIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'CALENDAR',
          tabBarIcon: ({ focused }) => <CalendarIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgCard,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
  },
  // Record icon: outer ring + inner filled dot
  recordRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordRingActive: {
    borderColor: colors.terracotta,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  recordDotActive: {
    backgroundColor: colors.terracotta,
  },
  // Calendar icon: border box with header strip + dot grid
  calWrap: {
    width: 18,
    height: 17,
    borderWidth: 1.5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  calHeader: {
    height: 5,
  },
  calGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
    gap: 2,
  },
  calDot: {
    width: 3,
    height: 3,
    borderRadius: 1,
    opacity: 0.7,
  },
});
