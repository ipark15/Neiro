import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

export default function Index() {
  const [destination, setDestination] = useState<'/(tabs)/record' | '/(auth)' | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setDestination(session ? '/(tabs)/record' : '/(auth)');
    });
  }, []);

  // Hold a blank screen while we check — splash already covers this on first load
  if (!destination) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <Redirect href={destination} />;
}
