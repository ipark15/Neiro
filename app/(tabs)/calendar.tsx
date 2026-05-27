import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, AudioModule } from 'expo-audio';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { getEntries } from '@/lib/api';
import type { Entry } from '@/lib/api';
import { colors, fonts, fontSize, spacing, radius, letterSpacing } from '@/constants/theme';

// ─── Date helpers ────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// 0 = Sunday, returns the weekday index of the 1st of the month
function getFirstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function calcStreak(entryDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (entryDates.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LANG_NAMES: Record<string, string> = {
  EN: 'English', KO: '한국어', JA: '日本語', ES: 'Español', FR: 'Français', PT: 'Português', DE: 'Deutsch',
};

// ─── Audio player ─────────────────────────────────────────────────────────────
// We create and destroy the Sound object per-entry. When the selected entry
// changes we unload the previous sound to free memory and avoid overlap.

function AudioPlayer({ uri, duration }: { uri: string; duration: number | null }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const playing = status.playing;
  const positionMs = status.currentTime * 1000;
  const totalDuration = status.duration > 0 ? status.duration : (duration ?? 0);
  const durationMs = totalDuration * 1000;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const elapsed = Math.floor(positionMs / 1000);

  async function togglePlay() {
    await AudioModule.setAudioModeAsync({ playsInSilentModeIOS: true });
    if (playing) {
      player.pause();
    } else {
      if (status.didJustFinish) player.seekTo(0);
      player.play();
    }
  }

  return (
    <View style={playerStyles.row}>
      <TouchableOpacity style={playerStyles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
        {status.isLoading ? (
          <ActivityIndicator color={colors.bgCard} size="small" />
        ) : (
          <Text style={playerStyles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
        )}
      </TouchableOpacity>

      {/* Progress track — simple View-based bar, no library needed */}
      <View style={playerStyles.track}>
        <View style={[playerStyles.fill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      <Text style={playerStyles.time}>
        {playing ? formatDuration(elapsed) : formatDuration(duration)}
      </Text>
    </View>
  );
}

const playerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: colors.bgCard,
    fontSize: 11,
  },
  track: {
    flex: 1,
    height: 3,
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.terracotta,
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    minWidth: 30,
    textAlign: 'right',
  },
});

// ─── Calendar screen ──────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today));
  const [loading, setLoading] = useState(true);

  // Reload entries every time this tab comes into focus so new recordings appear
  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getEntries(user.id);
      setEntries(data);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }

  // Build a map of dateKey → Entry for O(1) lookups in the grid
  const entryMap = new Map<string, Entry>(entries.map((e) => [e.date, e]));
  const entryDates = new Set(entries.map((e) => e.date));
  const uniqueLangs = new Set(entries.map((e) => e.language)).size;
  const streak = calcStreak(entryDates);

  const todayKey = toDateKey(today);
  const selectedEntry = entryMap.get(selectedDate) ?? null;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  // Build the grid: leading empty slots + day numbers
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>your year, day by day</Text>
          <Text style={styles.headerTitle}>The Ledger</Text>
        </View>

        {/* Stats row — three equal boxes */}
        <View style={styles.statsRow}>
          {[
            { value: entries.length, label: 'ENTRIES' },
            { value: uniqueLangs, label: 'LANGUAGES' },
            { value: streak, label: 'DAY STREAK' },
          ].map(({ value, label }, i, arr) => (
            <View key={label} style={[styles.statBox, i === arr.length - 1 && { borderRightWidth: 0 }]}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTHS[month]} <Text style={styles.yearLabel}>{year}</Text>
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={styles.weekDay}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid — rows of 7 */}
        {loading ? (
          <ActivityIndicator color={colors.textMuted} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;

              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasEntry = entryMap.has(dateKey);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              const entry = entryMap.get(dateKey);
              const dotColor = entry ? (colors.lang[entry.language] ?? colors.terracotta) : undefined;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isToday && !isSelected && styles.cellToday,
                  ]}
                  onPress={() => setSelectedDate(dateKey)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>
                    {day}
                  </Text>
                  {/* Always render dot — opacity 0 keeps layout stable on empty days */}
                  <View style={[styles.entryDot, { backgroundColor: dotColor ?? 'transparent', opacity: hasEntry ? 1 : 0 }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Bottom section — always rendered with fixed min-height to prevent calendar shifting */}
        <View style={styles.bottomSection}>
          {selectedEntry ? (
            <TouchableOpacity
              style={styles.entryCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/entry/[id]', params: { id: selectedEntry.id, data: JSON.stringify(selectedEntry) } })}
            >
              <View style={styles.entryCardHeader}>
                <View>
                  <Text style={styles.entryDate}>{formatDisplayDate(selectedEntry.date)}</Text>
                  <Text style={styles.entryLang}>{LANG_NAMES[selectedEntry.language] ?? selectedEntry.language}</Text>
                </View>
                <View style={[styles.langBadge, { backgroundColor: colors.lang[selectedEntry.language] ?? colors.terracotta }]}>
                  <Text style={styles.langBadgeText}>{selectedEntry.language}</Text>
                </View>
              </View>

              {selectedEntry.transcript ? (
                <Text style={styles.transcript} numberOfLines={2}>
                  {selectedEntry.transcript}
                </Text>
              ) : null}

              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>Tap to read full entry →</Text>
              </View>

              <AudioPlayer
                key={selectedEntry.id}
                uri={selectedEntry.audio_url}
                duration={selectedEntry.duration_seconds}
              />
            </TouchableOpacity>
          ) : (
            !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No entry for this day.</Text>
              </View>
            )
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  headerSub: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    // Last box override applied inline via index
  },
  statValue: {
    fontFamily: fonts.serifRegular,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs - 1,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
    marginTop: 2,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontFamily: fonts.serif,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  monthLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  yearLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.sm,
  },
  cellSelected: {
    backgroundColor: colors.bgDark,
    borderColor: colors.bgDark,
  },
  cellToday: {
    borderColor: colors.terracotta,
    borderStyle: 'dashed',
  },
  dayNum: {
    fontFamily: fonts.serifRegular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  dayNumSelected: {
    color: colors.bgCard,
  },
  entryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  entryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryDate: {
    fontFamily: fonts.serif,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  entryLang: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  langBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  langBadgeText: {
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
  tapHint: {
    alignItems: 'flex-end',
  },
  tapHintText: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  bottomSection: {
    minHeight: 160,
    marginHorizontal: spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
