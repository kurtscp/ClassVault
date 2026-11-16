import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';

export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  if (status === 'signedIn') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/sign-in" />;
}