import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { colors, fonts, fontSize, spacing, radius, letterSpacing } from '@/constants/theme';

type Mode = 'signup' | 'signin';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode ?? 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        router.replace('/(tabs)/record');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)/record');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.brand}>
              Neiro <Text style={styles.kanji}>音色</Text>
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <Text style={styles.eyebrow}>
            {mode === 'signup' ? "LET'S BEGIN" : 'WELCOME BACK'}
          </Text>
          <Text style={styles.headline}>
            {mode === 'signup' ? (
              <>Begin a <Text style={styles.headlineAccent}>quiet shelf</Text> of days.</>
            ) : (
              <>Your entries{'\n'}are waiting.</>
            )}
          </Text>
          <Text style={styles.sub}>Your entries sync across all your devices.</Text>

          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleOption, mode === 'signin' && styles.toggleOptionActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.toggleText, mode === 'signin' && styles.toggleTextActive]}>
                Sign in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, mode === 'signup' && styles.toggleOptionActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
                Create account
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR WITH EMAIL</Text>
            <View style={styles.divider} />
          </View>

          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>YOUR NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Camila"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="you@somewhere.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="········"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.bgCard} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'signup' ? 'Begin journaling  →' : 'Sign in  →'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>terms</Text>. Your entries belong to you, always.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginBottom: spacing.xl,
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
  brand: {
    fontFamily: fonts.serifItalic,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  kanji: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: letterSpacing.wide,
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: fontSize.xl + 4,
    color: colors.textPrimary,
    lineHeight: 42,
    marginBottom: spacing.sm,
  },
  headlineAccent: {
    fontFamily: fonts.serifItalic,
    color: colors.terracotta,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.lg,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  toggleOptionActive: {
    backgroundColor: colors.bgDark,
  },
  toggleText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    fontFamily: fonts.sansMedium,
    color: colors.bgCard,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: letterSpacing.wide,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    letterSpacing: letterSpacing.wide,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: colors.bgDark,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.base,
    color: colors.bgCard,
    letterSpacing: 0.3,
  },
  terms: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: colors.textSecondary,
  },
});
