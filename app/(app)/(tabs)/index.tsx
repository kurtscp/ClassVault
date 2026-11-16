import { View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function CoursesMinimalScreen() {
  const { profile } = useAuth();

  const fullName = profile?.full_name ?? 'User';
  const role = profile?.role ?? 'student';

  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="h1" className="text-ink text-center">
          Signed in as {fullName} ({role})
        </Text>
      </View>
    </Screen>
  );
}
