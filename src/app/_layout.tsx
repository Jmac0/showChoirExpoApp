import { AuthProvider } from "@/contexts/authContext";
import "../global.css";
import { Slot, Stack } from "expo-router";

export default function Layout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
