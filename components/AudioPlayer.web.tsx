// Web version — uses HTML Audio API (expo-audio has no web support)
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = new Audio(uri);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      const dur = audio.duration || duration || 0;
      setProgress(dur > 0 ? audio.currentTime / dur : 0);
      setElapsed(Math.floor(audio.currentTime));
    };

    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
    };
  }, [uri]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (progress >= 1) {
        audio.currentTime = 0;
        setProgress(0);
        setElapsed(0);
      }
      audio.play();
      setPlaying(true);
    }
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
        <Text style={styles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
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
