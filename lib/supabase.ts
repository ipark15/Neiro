import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// During Expo's SSR render pass (node/render.js) the code runs in Node.js 20
// which has no native WebSocket. metro.config.js stubs `ws` to an empty module
// for browser/native bundles, but the stub is still truthy, so passing it here
// satisfies Supabase's "transport required in Node < 22" check without throwing.
const wsTransport = typeof WebSocket === 'undefined' ? require('ws') : undefined;

// On web the default localStorage adapter works; on native there is no
// localStorage, so without AsyncStorage the session lives in memory only and
// users are signed out on every app restart.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
  auth: Platform.OS === 'web'
    ? {}
    : {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
});
