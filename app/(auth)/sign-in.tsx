import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AuthHeader } from '@/components/auth';
import { Button, Input, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { toUserMessage } from '@/lib/errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {};

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
      await signIn({
        email: email.trim(),
        password,
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
          type="signIn"
          title="Welcome back"
          subtitle="Sign in to open your class files."
        />

        <View className="gap-4 mb-6">
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
            placeholder="Enter your password"
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
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {serverError ? (
          <Text variant="small" tone="danger" className="mb-4 text-center">
            {serverError}
          </Text>
        ) : null}

        <Button
          label="Sign in"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={handleSubmit}
        />

        <View className="flex-row items-center justify-center mt-6 flex-wrap">
          <Text variant="small" tone="secondary">
            New to ClassVault?{' '}
          </Text>
          <Button
            variant="ghost"
            label="Create an account"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
