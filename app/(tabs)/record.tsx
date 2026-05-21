import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { uploadEntry, getEntries } from '@/lib/api';
import LangSelector from '@/components/LangSelector';
import Waveform from '@/components/Waveform';
import { colors, fonts, fontSize, spacing, radius, letterSpacing } from '@/constants/theme';

type Status = 'ready' | 'recording' | 'processing';

const WAVEFORM_BARS = 40;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(): { day: string; date: string } {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return { day, date };
}

function formatVolume(count: number): string {
  return `VOL.${count.toString().padStart(3, '0')}`;
}

export default function RecordScreen() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState('EN');
  const [status, setStatus] = useState<Status>('ready');
  const [timer, setTimer] = useState(0);
  const animatedBars = useRef<Animated.Value[]>(
    Array.from({ length: WAVEFORM_BARS }, () => new Animated.Value(4))
  );
  const rawAmplitudes = useRef<number[]>(Array(WAVEFORM_BARS).fill(0));
  const [entryCount, setEntryCount] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { day, date } = formatDate();

  useEffect(() => {
    loadEntryCount();
  }, []);

  async function loadEntryCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const entries = await getEntries(user.id);
      setEntryCount(entries.length);
    } catch {
      // non-critical, leave at 0
    }
  }

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record entries.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      recording.setOnRecordingStatusUpdate((s) => {
        if (!s.isRecording) return;
        const metering = s.metering ?? -160;
        const normalized = Math.max(0, Math.min(1, (metering + 60) / 60));
        rawAmplitudes.current = [...rawAmplitudes.current.slice(1), normalized];
        rawAmplitudes.current.forEach((val, i) => {
          animatedBars.current[i].setValue(val * 44 + 4);
        });
      });

      recording.setProgressUpdateInterval(50);
      await recording.startAsync();
      recordingRef.current = recording;
      setStatus('recording');
      setTimer(0);

      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    stopTimer();
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      setStatus('processing');
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const today = new Date().toISOString().split('T')[0];

      await uploadEntry({
        file: { uri, name: 'recording.m4a', type: 'audio/m4a' },
        user_id: user.id,
        date: today,
        duration_seconds: timer,
      });

      setEntryCount((c) => c + 1);
      rawAmplitudes.current = Array(WAVEFORM_BARS).fill(0);
      animatedBars.current.forEach((v) => v.setValue(4));
      setTimer(0);
      setStatus('ready');

      router.replace('/(tabs)/calendar');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save entry.';
      Alert.alert('Error', message);
      setStatus('ready');
    }
  }, [stopTimer, timer, router]);

  function handleToggle() {
    if (status === 'ready') startRecording();
    else if (status === 'recording') stopRecording();
  }

  const statusLabel = status === 'ready' ? 'READY' : status === 'recording' ? 'RECORDING' : 'SAVING…';
  const statusColor = status === 'recording' ? colors.terracotta : colors.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDay}>{day} · {date}</Text>
            <Text style={styles.headerTitle}>
              Neiro <Text style={styles.headerKanji}>音色</Text>
            </Text>
          </View>
          <Text style={styles.volLabel}>{formatVolume(entryCount)}</Text>
        </View>

        <Text style={styles.sectionLabel}>TODAY, SPEAKING IN</Text>
        <LangSelector selected={selectedLang} onSelect={setSelectedLang} />

        <View style={styles.meterRow}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.timer}>{formatTimer(timer)}</Text>
        </View>

        <View style={styles.waveformContainer}>
          <Waveform active={status === 'recording'} bars={animatedBars.current} />
        </View>

        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>{selectedLang} TRANSCRIPT</Text>
          <Text style={styles.transcriptPlaceholder}>
            {status === 'ready'
              ? `Press the dot below. Speak your day in ${selectedLang === 'EN' ? 'English' : selectedLang}.`
              : status === 'recording'
              ? 'Listening…'
              : 'Transcribing your entry…'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.recordArea}>
        <TouchableOpacity
          style={[styles.recordBtn, status === 'recording' && styles.recordBtnActive]}
          onPress={handleToggle}
          disabled={status === 'processing'}
          activeOpacity={0.8}
        >
          {status === 'processing' ? (
            <ActivityIndicator color={colors.terracotta} />
          ) : (
            <View style={[styles.recordDot, status === 'recording' && styles.recordDotStop]} />
          )}
        </TouchableOpacity>
        <Text style={styles.recordHint}>
          {status === 'ready' ? 'tap to begin' : status === 'recording' ? 'tap to stop' : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  headerDay: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    lineHeight: 38,
  },
  headerKanji: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  volLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: letterSpacing.wide,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  meterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
  },
  timer: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  waveformContainer: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  transcriptBox: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    minHeight: 120,
  },
  transcriptLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  transcriptPlaceholder: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 24,
  },
  recordArea: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  recordBtnActive: {
    borderColor: colors.terracotta,
  },
  recordDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.terracotta,
  },
  recordDotStop: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: colors.terracotta,
  },
  recordHint: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
