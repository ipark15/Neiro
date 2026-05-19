import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '@/constants/theme';

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'ES', label: 'Español' },
  { code: 'FR', label: 'Français' },
  { code: 'PT', label: 'Português' },
  { code: 'DE', label: 'Deutsch' },
  { code: 'JA', label: '日本語' },
];

interface LangSelectorProps {
  selected: string;
  onSelect: (code: string) => void;
}

export default function LangSelector({ selected, onSelect }: LangSelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
      {LANGUAGES.map(({ code, label }) => {
        const isSelected = selected === code;
        return (
          <TouchableOpacity
            key={code}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(code)}
          >
            <View style={[styles.dot, { backgroundColor: colors.lang[code] }]} />
            <Text style={[styles.code, isSelected && styles.codeSelected]}>{code}</Text>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  pillSelected: {
    backgroundColor: colors.bgDark,
    borderColor: colors.bgDark,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  codeSelected: {
    color: colors.bgCard,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.bgCard,
  },
});
