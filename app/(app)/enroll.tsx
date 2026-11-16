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
import { useEnrollment } from '@/hooks/useEnrollment';

export default function EnrollScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const { enroll, isEnrolling, error: hookError } = useEnrollment();

  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // If an instructor reaches this route, redirect to Courses (SEC-6, SEC-7)
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
      // On success: navigates to /course/<returned_course_id> via useEnrollment hook
    } catch {
      // Error is set in useEnrollment hook and reflected in UI via effectiveError
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <Screen scroll className="py-6">
        {/* Header: back button + title (UX-4) */}
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

        {/* Join code entry form */}
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
