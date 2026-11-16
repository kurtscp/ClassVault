import { View } from 'react-native';

import { LogoStacked, Mark, Text } from '../ui';

export interface AuthHeaderProps {
  type: 'signIn' | 'signUp';
  title: string;
  subtitle: string;
}

/**
 * Unified auth header adhering to brand lockup guidelines (BR-1, BR-4).
 * Sign in: LogoStacked (120px) + H1 + body-secondary
 * Sign up: Mark (48px) + H1 + body-secondary
 */
export function AuthHeader({ type, title, subtitle }: AuthHeaderProps) {
  return (
    <View className="items-center mb-8">
      {type === 'signIn' ? (
        <LogoStacked width={120} />
      ) : (
        <Mark width={48} />
      )}
      <Text variant="h1" className="text-ink mt-6 mb-2 text-center">
        {title}
      </Text>
      <Text variant="body" tone="secondary" className="text-center">
        {subtitle}
      </Text>
    </View>
  );
}

