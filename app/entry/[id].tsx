import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import type { Entry } from '@/lib/api';
import { colors, fonts, fontSize, spacing, radius, letterSpacing } from '@/constants/theme';

const LANG_NAMES: Record<string, string> = {
  EN: 'English', KO: '한국어', JA: '日本語',
  ES: 'Español', FR: 'Français', PT: 'Português', DE: 'Deutsch',
};

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioPlayer({ uri, duration }: { uri: string; duration: number | null }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState((duration ?? 0) * 1000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, [uri]);

  async function togglePlay() {
    if (loading) return;
    if (!soundRef.current) {
      setLoading(true);
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) return;
            setPositionMs(status.positionMillis);
            setDurationMs(status.durationMillis ?? durationMs);
            setPlaying(status.isPlaying);
            if (status.didJustFinish) { setPlaying(false); setPositionMs(0); }
          }
        );
        soundRef.current = sound;
        setPlaying(true);
      } catch {
        // audio URL not yet accessible
      } finally {
        setLoading(false);
      }
      return;
    }
    if (playing) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  }

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={playerStyles.container}>
      <TouchableOpacity style={playerStyles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
        {loading
          ? <ActivityIndicator color={colors.bgCard} size="small" />
          : <Text style={playerStyles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
        }
      </TouchableOpacity>
      <View style={playerStyles.track}>
        <View style={[playerStyles.fill, { flex: progress }]} />
        <View style={{ flex: Math.max(1 - progress, 0) }} />
      </View>
      <Text style={playerStyles.time}>
        {playing ? formatDuration(Math.floor(positionMs / 1000)) : formatDuration(duration)}
      </Text>
    </View>
  );
}

const playerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: colors.bgCard, fontSize: 13 },
  track: {
    flex: 1,
    height: 3,
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.terracotta },
  time: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
});

export default function EntryDetailScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const entry: Entry = JSON.parse(data);

  const langColor = colors.lang[entry.language] ?? colors.terracotta;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topBrand}>Neiro <Text style={styles.topKanji}>音色</Text></Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Date + language */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.dateLabel}>
              {formatFullDate(entry.date)}
            </Text>
            <Text style={styles.langName}>
              {LANG_NAMES[entry.language] ?? entry.language}
            </Text>
          </View>
          <View style={[styles.langBadge, { backgroundColor: langColor }]}>
            <Text style={styles.langBadgeText}>{entry.language}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Full transcript */}
        <View style={styles.transcriptSection}>
          <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
          {entry.transcript ? (
            <Text style={styles.transcript}>{entry.transcript}</Text>
          ) : (
            <Text style={styles.transcriptEmpty}>No transcript available.</Text>
          )}
        </View>

        {/* Audio player */}
        <View style={styles.playerSection}>
          <Text style={styles.playerLabel}>RECORDING</Text>
          <View style={styles.playerCard}>
            <View style={styles.playerMeta}>
              <Text style={styles.playerMetaText}>
                {formatFullDate(entry.date)}
              </Text>
              <Text style={styles.playerMetaText}>
                {formatDuration(entry.duration_seconds)}
              </Text>
            </View>
            <AudioPlayer uri={entry.audio_url} duration={entry.duration_seconds} />
          </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: fonts.serif,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    lineHeight: 26,
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  dateLabel: {
    fontFamily: fonts.serif,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  langName: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  langBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  langBadgeText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  transcriptSection: {
    marginBottom: spacing.xl,
  },
  transcriptLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
    marginBottom: spacing.md,
  },
  transcript: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  transcriptEmpty: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  playerSection: {
    gap: spacing.md,
  },
  playerLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
  },
  playerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  playerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  playerMetaText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
