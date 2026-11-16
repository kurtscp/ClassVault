import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/hooks/useAuth';

/**
 * App group layout.
 * Ensures signed-out users cannot access app routes (redirects to sign-in).
 */
export default function AppLayout() {
  const { status } = useAuth();

  if (status === 'signedOut') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
