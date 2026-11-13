import { Courgette_400Regular, useFonts } from '@expo-google-fonts/courgette';
import { Stack } from 'expo-router';

import { AuthProvider } from '@/contexts/authContext';
import '../global.css';

export default function Layout() {
  // Courgette - the script lettering used for the screen titles (as on the
  // website). Wait for it so titles don't flash in the plain font; if it
  // can't load, carry on with the plain one.
  const [fontsLoaded, fontError] = useFonts({ Courgette_400Regular });
  if (!fontsLoaded && !fontError) return null;

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
