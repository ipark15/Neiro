// Native version — uses expo-audio
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, AudioModule } from 'expo-audio';
import { colors, fonts, fontSize, spacing, radius } from '@/constants/theme';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ uri, duration }: { uri: string; duration: number | null }) {
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
    <View style={styles.row}>
      <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
        {status.isLoading ? (
          <ActivityIndicator color={colors.bgCard} size="small" />
        ) : (
          <Text style={styles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
        )}
      </TouchableOpacity>
      <View style={styles.track}>
        <View style={[styles.fill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
      <Text style={styles.time}>
        {playing ? formatDuration(elapsed) : formatDuration(duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
