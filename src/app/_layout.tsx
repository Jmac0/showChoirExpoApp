import { Courgette_400Regular, useFonts } from '@expo-google-fonts/courgette';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider } from '@/contexts/authContext';
import '../global.css';

// Keep the splash screen up until the title font's ready, rather than a
// blank screen in between
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. a reload while developing) - nothing to do
});

export default function Layout() {
  // Courgette - the script lettering used for the screen titles (as on the
  // website). Wait for it so titles don't flash in the plain font; if it
  // can't load, carry on with the plain one.
  const [fontsLoaded, fontError] = useFonts({ Courgette_400Regular });
  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
