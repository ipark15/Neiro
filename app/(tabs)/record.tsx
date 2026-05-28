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
  Platform,
} from 'react-native';
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

// ─── Platform-split: NativeRecordScreen loads expo-audio hooks safely ─────────
function NativeRecordScreen() {
  const { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } = require('expo-audio');
  return <RecordScreenNative
    useAudioRecorder={useAudioRecorder}
    useAudioRecorderState={useAudioRecorderState}
    AudioModule={AudioModule}
    RecordingPresets={RecordingPresets}
  />;
}

export default function RecordScreen() {
  return Platform.OS === 'web' ? <RecordScreenWeb /> : <NativeRecordScreen />;
}

// ─── Web record screen ────────────────────────────────────────────────────────
function RecordScreenWeb() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState('EN');
  const [status, setStatus] = useState<Status>('ready');
  const [timer, setTimer] = useState(0);
  const animatedBars = useRef<Animated.Value[]>(
    Array.from({ length: WAVEFORM_BARS }, () => new Animated.Value(4))
  );
  const rawAmplitudes = useRef<number[]>(Array(WAVEFORM_BARS).fill(0));
  const [entryCount, setEntryCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { day, date } = formatDate();

  useEffect(() => { loadEntryCount(); }, []);

  async function loadEntryCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const entries = await getEntries(user.id);
      setEntryCount(entries.length);
    } catch {}
  }

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // iOS Safari only supports audio/mp4 — pick the best supported type
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      const animInterval = setInterval(() => {
        rawAmplitudes.current = rawAmplitudes.current.map(() => Math.random() * 0.8);
        rawAmplitudes.current.forEach((val, i) => animatedBars.current[i].setValue(val * 44 + 4));
      }, 100);
      (mr as any)._animInterval = animInterval;

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(100);
      setStatus('recording');
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } catch {
      alert('Microphone access is required to record entries.');
    }
  }, []);

  const stopRecording = useCallback((currentTimer: number) => {
    stopTimer();
    setStatus('processing');
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    clearInterval((mr as any)._animInterval);
    mr.onstop = async () => {
      try {
        // Use the actual MIME type the browser chose (e.g. audio/mp4 on iOS Safari)
        const baseMime = (mr.mimeType || 'audio/webm').split(';')[0];
        const ext = baseMime === 'audio/mp4' ? 'm4a' : (baseMime.split('/')[1] ?? 'webm');
        const blob = new Blob(audioChunksRef.current, { type: baseMime });
        mr.stream.getTracks().forEach((t) => t.stop());
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in');
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        await uploadEntry({ file: blob, filename: `recording.${ext}`, user_id: user.id, date: today, duration_seconds: currentTimer });
        setEntryCount((c) => c + 1);
        rawAmplitudes.current = Array(WAVEFORM_BARS).fill(0);
        animatedBars.current.forEach((v) => v.setValue(4));
        setTimer(0);
        setStatus('ready');
        router.replace('/(tabs)/calendar');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save entry.');
        setStatus('ready');
      }
    };
    mr.stop();
  }, [stopTimer, router]);

  function handleToggle() {
    if (status === 'ready') startRecording();
    else if (status === 'recording') stopRecording(timer);
  }

  const statusLabel = status === 'ready' ? 'READY' : status === 'recording' ? 'RECORDING' : 'SAVING…';
  const statusColor = status === 'recording' ? colors.terracotta : colors.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDay}>{day} · {date}</Text>
            <Text style={styles.headerTitle}>Neiro <Text style={styles.headerKanji}>音色</Text></Text>
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
            {status === 'ready' ? `Press the dot below. Speak your day in ${selectedLang === 'EN' ? 'English' : selectedLang}.`
              : status === 'recording' ? 'Listening…' : 'Transcribing your entry…'}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.recordArea}>
        <TouchableOpacity style={[styles.recordBtn, status === 'recording' && styles.recordBtnActive]} onPress={handleToggle} disabled={status === 'processing'} activeOpacity={0.8}>
          {status === 'processing' ? <ActivityIndicator color={colors.terracotta} /> : <View style={[styles.recordDot, status === 'recording' && styles.recordDotStop]} />}
        </TouchableOpacity>
        <Text style={styles.recordHint}>{status === 'ready' ? 'tap to begin' : status === 'recording' ? 'tap to stop' : ''}</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Native record screen ─────────────────────────────────────────────────────
function RecordScreenNative({ useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets }: any) {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState('EN');
  const [status, setStatus] = useState<Status>('ready');
  const [timer, setTimer] = useState(0);
  const animatedBars = useRef<Animated.Value[]>(
    Array.from({ length: WAVEFORM_BARS }, () => new Animated.Value(4))
  );
  const rawAmplitudes = useRef<number[]>(Array(WAVEFORM_BARS).fill(0));
  const [entryCount, setEntryCount] = useState(0);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 50);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { day, date } = formatDate();

  useEffect(() => {
    if (!recorderState.isRecording) return;
    const metering = recorderState.metering ?? -160;
    const normalized = Math.max(0, Math.min(1, (metering + 60) / 60));
    rawAmplitudes.current = [...rawAmplitudes.current.slice(1), normalized];
    rawAmplitudes.current.forEach((val, i) => {
      animatedBars.current[i].setValue(val * 44 + 4);
    });
  }, [recorderState.metering, recorderState.isRecording]);

  useEffect(() => {
    loadEntryCount();
  }, []);

  async function loadEntryCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const entries = await getEntries(user.id);
      setEntryCount(entries.length);
    } catch {}
  }

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record entries.');
        return;
      }
      await AudioModule.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } catch {
      Alert.alert('Error', 'Could not start recording.');
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    stopTimer();
    try {
      setStatus('processing');
      await recorder.stop();
      await AudioModule.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording URI');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await uploadEntry({ file: { uri, name: 'recording.m4a', type: 'audio/m4a' }, user_id: user.id, date: today, duration_seconds: timer });
      setEntryCount((c) => c + 1);
      rawAmplitudes.current = Array(WAVEFORM_BARS).fill(0);
      animatedBars.current.forEach((v) => v.setValue(4));
      setTimer(0);
      setStatus('ready');
      router.replace('/(tabs)/calendar');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save entry.');
      setStatus('ready');
    }
  }, [stopTimer, timer, router, recorder]);

  function handleToggle() {
    if (status === 'ready') startRecording();
    else if (status === 'recording') stopRecording();
  }

  const statusLabel = status === 'ready' ? 'READY' : status === 'recording' ? 'RECORDING' : 'SAVING…';
  const statusColor = status === 'recording' ? colors.terracotta : colors.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDay}>{day} · {date}</Text>
            <Text style={styles.headerTitle}>Neiro <Text style={styles.headerKanji}>音色</Text></Text>
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
            {status === 'ready' ? `Press the dot below. Speak your day in ${selectedLang === 'EN' ? 'English' : selectedLang}.`
              : status === 'recording' ? 'Listening…' : 'Transcribing your entry…'}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.recordArea}>
        <TouchableOpacity style={[styles.recordBtn, status === 'recording' && styles.recordBtnActive]} onPress={handleToggle} disabled={status === 'processing'} activeOpacity={0.8}>
          {status === 'processing' ? <ActivityIndicator color={colors.terracotta} /> : <View style={[styles.recordDot, status === 'recording' && styles.recordDotStop]} />}
        </TouchableOpacity>
        <Text style={styles.recordHint}>{status === 'ready' ? 'tap to begin' : status === 'recording' ? 'tap to stop' : ''}</Text>
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
