import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

/**
 * Auth group layout.
 * Ensures signed-in users cannot access auth routes (redirects to app tabs).
 */
export default function AuthLayout() {
  const { status } = useAuth();

  if (status === 'signedIn') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
