import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '@/constants/theme';

interface Entry {
  id: string;
  date: string;
  language: string;
  transcript: string | null;
  audio_url: string;
  duration_seconds: number | null;
}

interface EntryCardProps {
  entry: Entry;
  onPress?: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function EntryCard({ entry, onPress }: EntryCardProps) {
  const langColor = colors.lang[entry.language] ?? colors.textSecondary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(entry.date)}</Text>
        <View style={[styles.langBadge, { backgroundColor: langColor }]}>
          <Text style={styles.langCode}>{entry.language}</Text>
        </View>
      </View>
      <Text style={styles.transcript} numberOfLines={2}>
        {entry.transcript ?? '—'}
      </Text>
      <View style={styles.audioRow}>
        <View style={styles.playButton} />
        <Text style={styles.duration}>{formatDuration(entry.duration_seconds)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  langBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  langCode: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  transcript: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgDark,
  },
  duration: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
