import { useState } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileScreen() {
  const { user, profile, role, signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fullName = profile?.full_name ?? 'User';
  const email = user?.email ?? '';
  const initials = getInitials(fullName);
  const roleLabel = role === 'instructor' ? 'Instructor' : 'Student';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
      // Auth guard navigates automatically to sign-in on status === 'signedOut'
    } finally {
      setIsSigningOut(false);
      setShowConfirm(false);
    }
  }

  return (
    <Screen scroll className="py-6">
      <Text variant="h1" className="text-ink mb-6">
        Profile
      </Text>

      {/* Profile summary card */}
      <Card className="mb-6">
        <View className="flex-row items-center">
          <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mr-4">
            <Text variant="title" className="font-heading text-action">
              {initials}
            </Text>
          </View>
          <View className="flex-1 justify-center">
            <Text variant="title" className="text-ink">
              {fullName}
            </Text>
            {email ? (
              <Text variant="small" tone="secondary" className="mt-0.5 mb-2">
                {email}
              </Text>
            ) : null}
            <Badge label={roleLabel} />
          </View>
        </View>
      </Card>

      {/* Sign out section with inline confirmation step */}
      <View className="mb-8">
        {showConfirm ? (
          <View className="p-4 bg-white rounded-card border border-line">
            <Text variant="body" className="font-heading text-ink text-center mb-3">
              Sign out of ClassVault?
            </Text>
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                label="Cancel"
                className="flex-1"
                disabled={isSigningOut}
                onPress={() => setShowConfirm(false)}
              />
              <Button
                variant="danger"
                label="Sign out"
                className="flex-1"
                loading={isSigningOut}
                disabled={isSigningOut}
                onPress={handleSignOut}
              />
            </View>
          </View>
        ) : (
          <Button
            variant="secondary"
            label="Sign out"
            fullWidth
            onPress={() => setShowConfirm(true)}
          />
        )}
      </View>

      {/* App version caption */}
      <View className="items-center mt-auto pt-4">
        <Text variant="caption" className="text-fg-muted">
          ClassVault v{appVersion}
        </Text>
      </View>
    </Screen>
  );
}
