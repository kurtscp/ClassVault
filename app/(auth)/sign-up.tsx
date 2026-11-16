import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AuthHeader } from '@/components/auth';
import { Button, Input, Screen, Segmented, type SegmentedOption, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { toUserMessage } from '@/lib/errors';
import type { UserRole } from '@/types/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS: SegmentedOption[] = [
  { value: 'student', label: 'Student' },
  { value: 'instructor', label: 'Instructor' },
];

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: { fullName?: string; email?: string; password?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    setServerError(null);

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });
      // On success the auth guard navigates automatically (do not navigate manually)
    } catch (err) {
      setServerError(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <Screen scroll className="justify-center py-8">
        <AuthHeader
          type="signUp"
          title="Create your account"
          subtitle="Choose your role to get started."
        />

        <View className="gap-4 mb-6">
          <Input
            label="Full name"
            placeholder="e.g. Maria Santos"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) {
                setErrors((prev) => ({ ...prev, fullName: undefined }));
              }
              if (serverError) setServerError(null);
            }}
            errorText={errors.fullName}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined }));
              }
              if (serverError) setServerError(null);
            }}
            errorText={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            helperText="At least 8 characters"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
              if (serverError) setServerError(null);
            }}
            errorText={errors.password}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <View>
            <Text variant="small" className="font-heading text-fg mb-1.5">
              I am a
            </Text>
            <Segmented
              options={ROLE_OPTIONS}
              value={role}
              onChange={(val) => setRole(val as UserRole)}
            />
          </View>
        </View>

        {serverError ? (
          <Text variant="small" tone="danger" className="mb-4 text-center">
            {serverError}
          </Text>
        ) : null}

        <Button
          label="Create account"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={handleSubmit}
        />

        <View className="flex-row items-center justify-center mt-6 flex-wrap">
          <Text variant="small" tone="secondary">
            Already have an account?{' '}
          </Text>
          <Button
            variant="ghost"
            label="Sign in"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

