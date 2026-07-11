import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// On web the default localStorage adapter works; on native there is no
// localStorage, so without AsyncStorage the session lives in memory only and
// users are signed out on every app restart.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: Platform.OS === 'web'
    ? {}
    : {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
});
