import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendChatMessage, ChatMessage } from '@/lib/api';
import LangSelector from '@/components/LangSelector';
import { colors, fonts, fontSize, spacing, radius, letterSpacing } from '@/constants/theme';

type Status = 'idle' | 'recording' | 'thinking' | 'speaking' | 'blocked';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  audioBase64?: string;
}

export default function ChatScreen() {
  return Platform.OS === 'web' ? <ChatScreenWeb /> : <ChatScreenNative />;
}

function ChatScreenNative() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nativeFallback}>
        <Text style={styles.nativeFallbackText}>Partner is available on the web app.</Text>
      </View>
    </SafeAreaView>
  );
}

function ChatScreenWeb() {
  const [selectedLang, setSelectedLang] = useState('EN');
  const [status, setStatus] = useState<Status>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingAudio, setPendingAudio] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  function playAudio(base64: string) {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    currentAudioRef.current = audio;
    setStatus('speaking');
    audio.onended = () => setStatus('idle');
    audio.onerror = () => setStatus('idle');
    audio.play().catch(() => {
      // Safari blocks autoplay when triggered outside a direct user gesture.
      // Surface a tap-to-play prompt instead of silently failing.
      setPendingAudio(base64);
      setStatus('blocked');
    });
  }

  function playPending() {
    if (!pendingAudio) return;
    const base64 = pendingAudio;
    setPendingAudio(null);
    playAudio(base64);
  }

  const startRecording = useCallback(async () => {
    // Stop any playing AI audio before recording the user's reply
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        ) ?? '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.start(100);
      setStatus('recording');
    } catch {
      alert('Microphone access is required to use Partner.');
    }
  }, []);

  const stopRecording = useCallback(
    (currentMessages: Message[], lang: string) => {
      const mr = mediaRecorderRef.current;
      if (!mr) return;
      setStatus('thinking');

      // Capture history now (synchronously) before the async onstop handler
      const history: ChatMessage[] = currentMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      }));

      mr.onstop = async () => {
        try {
          const baseMime = (mr.mimeType || 'audio/webm').split(';')[0];
          const ext =
            baseMime === 'audio/mp4' ? 'm4a' : (baseMime.split('/')[1] ?? 'webm');
          const blob = new Blob(audioChunksRef.current, { type: baseMime });
          mr.stream.getTracks().forEach((t) => t.stop());

          const result = await sendChatMessage({
            file: blob,
            filename: `recording.${ext}`,
            language: lang,
            conversation_history: history,
          });

          const newMessages: Message[] = [
            ...currentMessages,
            { role: 'user', text: result.user_message },
            { role: 'assistant', text: result.ai_text, audioBase64: result.ai_audio_base64 },
          ];
          setMessages(newMessages);
          playAudio(result.ai_audio_base64);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to process message.');
          setStatus('idle');
        }
      };
      mr.stop();
    },
    []
  );

  function handleToggle() {
    if (status === 'blocked') {
      playPending();
    } else if (status === 'idle' || status === 'speaking') {
      startRecording();
    } else if (status === 'recording') {
      stopRecording(messages, selectedLang);
    }
  }

  function handleLangChange(lang: string) {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setSelectedLang(lang);
    setMessages([]);
    setStatus('idle');
  }

  const statusLabel: Record<Status, string> = {
    idle: 'TAP TO SPEAK',
    recording: 'LISTENING…',
    thinking: 'THINKING…',
    speaking: 'SPEAKING…',
    blocked: 'TAP TO PLAY',
  };

  const isDisabled = status === 'thinking';
  const isRecording = status === 'recording';
  const isBlocked = status === 'blocked';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Partner <Text style={styles.headerKanji}>話す</Text>
        </Text>
      </View>

      <Text style={styles.sectionLabel}>PRACTICING IN</Text>
      <LangSelector selected={selectedLang} onSelect={handleLangChange} />

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Start the conversation.</Text>
            <Text style={styles.emptyBody}>
              Tap the button below and speak in {selectedLang}. Your partner will reply in kind.
            </Text>
          </View>
        ) : (
          messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.role === 'user' ? styles.userText : styles.aiText,
                ]}
              >
                {msg.text}
              </Text>
              {msg.role === 'assistant' && msg.audioBase64 && (
                <TouchableOpacity
                  onPress={() => playAudio(msg.audioBase64!)}
                  style={styles.replayBtn}
                >
                  <Text style={styles.replayLabel}>▶ REPLAY</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.recordArea}>
        <Text style={styles.statusLabel}>{statusLabel[status]}</Text>
        <TouchableOpacity
          style={[styles.recordBtn, isRecording && styles.recordBtnActive, isBlocked && styles.recordBtnBlocked]}
          onPress={handleToggle}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {status === 'thinking' ? (
            <ActivityIndicator color={colors.terracotta} />
          ) : isBlocked ? (
            <Text style={styles.playIcon}>▶</Text>
          ) : (
            <View style={[styles.recordDot, isRecording && styles.recordDotStop]} />
          )}
        </TouchableOpacity>
        <Text style={styles.recordHint}>
          {status === 'recording'
            ? 'tap to send'
            : status === 'speaking'
            ? 'tap to interrupt'
            : ''}
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
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  nativeFallbackText: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
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
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: letterSpacing.wide,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  messageList: {
    flex: 1,
    marginTop: spacing.lg,
  },
  messageListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bgDark,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  userText: {
    fontFamily: fonts.serifItalic,
    color: colors.bgCard,
  },
  aiText: {
    fontFamily: fonts.sans,
    color: colors.textPrimary,
  },
  replayBtn: {
    marginTop: spacing.sm,
  },
  replayLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.terracotta,
    letterSpacing: letterSpacing.wide,
  },
  recordArea: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  statusLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
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
  recordBtnBlocked: {
    borderColor: colors.terracotta,
    backgroundColor: colors.terracotta + '18',
  },
  playIcon: {
    fontSize: 22,
    color: colors.terracotta,
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
