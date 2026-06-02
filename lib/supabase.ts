import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// During Expo static export the code runs in Node.js 20, which has no native
// WebSocket. Provide the `ws` package as a fallback so Supabase realtime
// doesn't throw at module initialisation time.
const realtimeOptions =
  typeof WebSocket === 'undefined'
    ? { realtime: { transport: require('ws') } }
    : {};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, realtimeOptions);
