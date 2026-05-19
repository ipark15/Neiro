import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, letterSpacing } from '@/constants/theme';

function RecordIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.recordDot, focused && styles.recordDotActive]} />
  );
}

function CalendarIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.calendarIcon, focused && styles.calendarIconActive]}>
      <View style={styles.calendarTop} />
      <View style={styles.calendarGrid} />
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
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textSecondary,
  },
  recordDotActive: {
    backgroundColor: colors.terracotta,
  },
  calendarIcon: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  calendarIconActive: {
    borderColor: colors.terracotta,
  },
  calendarTop: {
    height: 4,
    backgroundColor: 'transparent',
  },
  calendarGrid: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
