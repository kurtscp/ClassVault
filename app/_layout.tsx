import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts as useJakartaFonts,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { AuthProvider, useAuth } from "@/hooks/useAuth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}

function RootNavigation() {
  const { status } = useAuth();

  const [jakartaLoaded, jakartaError] = useJakartaFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const fontsReady =
    (jakartaLoaded || jakartaError) && (interLoaded || interError);

  // Both typography and auth status initialization must be complete before hiding the splash screen (BUILD 2)
  const isReady = fontsReady && status !== "loading";

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  // Route protection is handled declaratively inside each group's _layout.tsx
  // via <Redirect>. Using Stack.Protected + useEffect simultaneously causes a
  // race: both fire when status changes, the second redirect arrives before the
  // target navigator has mounted, producing an Unmatched Route error.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
