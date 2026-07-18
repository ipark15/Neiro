import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { supabase } from '@/lib/supabase';
import { clearEntriesCache } from '@/lib/api';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    DMMono_400Regular,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Listen for sign-out and redirect back to auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearEntriesCache();
        router.replace('/(auth)');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // On web, don't hold the whole app blank while six font files download —
  // render immediately and let the fonts swap in when ready
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="entry/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
