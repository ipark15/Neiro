import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus, AudioModule } from 'expo-audio';
import type { Entry } from '@/lib/api';
import { updateEntry } from '@/lib/api';
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
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const playing = status.playing;
  const positionMs = status.currentTime * 1000;
  const totalDuration = status.duration > 0 ? status.duration : (duration ?? 0);
  const durationMs = totalDuration * 1000;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;

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
    <View style={playerStyles.container}>
      <TouchableOpacity style={playerStyles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
        {status.isLoading
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

  const [transcript, setTranscript] = useState(entry.transcript ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const langColor = colors.lang[entry.language] ?? colors.terracotta;

  function startEdit() {
    setDraft(transcript);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelEdit() {
    setIsEditing(false);
    setDraft('');
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await updateEntry(entry.id, draft);
      setTranscript(draft);
      setIsEditing(false);
    } catch {
      const msg = 'Could not save changes. Check your connection and try again.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Date + language */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.dateLabel}>{formatFullDate(entry.date)}</Text>
            <Text style={styles.langName}>{LANG_NAMES[entry.language] ?? entry.language}</Text>
          </View>
          <View style={[styles.langBadge, { backgroundColor: langColor }]}>
            <Text style={styles.langBadgeText}>{entry.language}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Full transcript */}
        <View style={styles.transcriptSection}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
            {!isEditing && (
              <TouchableOpacity onPress={startEdit} activeOpacity={0.6} style={styles.editBtnRow}>
                <Text style={styles.editBtnIcon}>✎</Text>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <TextInput
                ref={inputRef}
                style={styles.transcriptInput}
                value={draft}
                onChangeText={setDraft}
                multiline
                autoFocus
                textAlignVertical="top"
                placeholder="Write your entry…"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={saveEdit}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving
                    ? <ActivityIndicator color={colors.bgCard} size="small" />
                    : <Text style={styles.saveBtnText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          ) : transcript ? (
            <Text style={styles.transcript}>{transcript}</Text>
          ) : (
            <Text style={styles.transcriptEmpty}>No transcript available.</Text>
          )}
        </View>

        {/* Audio player */}
        <View style={styles.playerSection}>
          <Text style={styles.playerLabel}>RECORDING</Text>
          <View style={styles.playerCard}>
            <View style={styles.playerMeta}>
              <Text style={styles.playerMetaText}>{formatFullDate(entry.date)}</Text>
              <Text style={styles.playerMetaText}>{formatDuration(entry.duration_seconds)}</Text>
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
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  transcriptLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
  },
  editBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnIcon: {
    fontSize: 13,
    color: colors.terracotta,
    lineHeight: 16,
  },
  editBtn: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.terracotta,
    letterSpacing: letterSpacing.wide,
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
  transcriptInput: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 26,
    borderWidth: 1,
    borderColor: colors.terracotta,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 160,
    backgroundColor: colors.bgCard,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.bgDark,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.bgCard,
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
