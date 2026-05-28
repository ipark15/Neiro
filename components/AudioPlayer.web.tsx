// Web version — uses HTML Audio API (expo-audio has no web support)
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '@/constants/theme';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ uri, duration }: { uri: string; duration: number | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = new Audio(uri);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      const dur = audio.duration || duration || 0;
      setProgress(dur > 0 ? audio.currentTime / dur : 0);
      setElapsed(Math.floor(audio.currentTime));
    };

    const onEnded = () => {
      setPlaying(false);
      setIsLoading(false);
      setProgress(0);
      setElapsed(0);
    };

    // Fires when audio stalls mid-playback and is buffering
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.pause();
      audio.src = '';
    };
  }, [uri]);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || isLoading) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (progress >= 1) {
      audio.currentTime = 0;
      setProgress(0);
      setElapsed(0);
    }
    // Call play() synchronously before any state updates — iOS Safari requires
    // audio.play() to be called within the user-gesture call stack with no async
    // gaps or React state flushes preceding it.
    const playPromise = audio.play();
    setIsLoading(true);
    try {
      await playPromise;
      setPlaying(true);
    } catch (err) {
      console.error('Audio play failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
        {isLoading ? (
          <ActivityIndicator color={colors.bgCard} size="small" />
        ) : (
          <Text style={styles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
        )}
      </TouchableOpacity>
      <View style={styles.track}>
        <View style={[styles.fill, { flex: progress }]} />
        <View style={{ flex: Math.max(0.001, 1 - progress) }} />
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
