import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { Button, Input, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useEnrollment } from '@/hooks/useEnrollment';

export default function EnrollScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const { refetch } = useCourses();
  const { enroll, isEnrolling, error: hookError } = useEnrollment({ onCoursesRefetch: refetch });

  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Instructors cannot enroll; redirect them to the courses dashboard
  if (role === 'instructor') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const effectiveError = localError ?? hookError;
  const isSubmitDisabled = code.trim().length !== 6 || isEnrolling;

  async function handleSubmit() {
    if (isSubmitDisabled) return;
    setLocalError(null);
    try {
      await enroll(code.trim());
      // On success: useEnrollment calls refetch then router.replace('/(app)/(tabs)')
    } catch {
      // Error shown via effectiveError
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <Screen scroll className="py-6">
        <View className="flex-row items-center mb-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="mr-3 p-1.5 -ml-1 rounded-control active:bg-emerald-50"
          >
            <ArrowLeft size={24} className="text-fg" />
          </Pressable>
          <Text variant="h2" className="text-ink">
            Join a course
          </Text>
        </View>

        <View className="mb-6">
          <Input
            label="Join code"
            placeholder="e.g. A3X9K2"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              if (localError) setLocalError(null);
            }}
            helperText="Ask your instructor for the 6-character code."
            errorText={effectiveError ?? undefined}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        <Button
          label="Join course"
          variant="primary"
          fullWidth
          disabled={isSubmitDisabled}
          loading={isEnrolling}
          onPress={handleSubmit}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
