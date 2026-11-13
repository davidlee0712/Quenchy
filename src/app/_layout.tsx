import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import SignIn from '@/components/sign-in';
import SetupNeeded from '@/components/setup-needed';
import { useColors } from '@/constants/theme';
import { StoreProvider, useStore } from '@/lib/store';
import { supabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <Gate />
      </StoreProvider>
    </ThemeProvider>
  );
}

function Gate() {
  const { ready, session } = useStore();
  const c = useColors();

  useEffect(() => {
    if (ready || !supabaseConfigured) SplashScreen.hideAsync();
  }, [ready]);

  if (!supabaseConfigured) return <SetupNeeded />;
  if (!ready) return null;
  if (!session) return <SignIn />;

  return (
    <Stack screenOptions={{ headerTintColor: c.water, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Add drink' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
