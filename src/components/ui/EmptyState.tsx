import React from 'react';
import { View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: React.ReactNode | React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
  };
  className?: string;
}

/**
 * Empty state container.
 * Emphasizes active-voice invitations to perform an initial action (UX-1, UX-3).
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
  className = '',
}: EmptyStateProps) {
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{
        size?: number;
        strokeWidth?: number;
        className?: string;
      }>;
      return <IconComponent size={28} strokeWidth={1.75} className="text-brand" />;
    }
    return null;
  };

  return (
    <View className={`items-center justify-center p-6 text-center ${className}`.trim()}>
      <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-4">
        {renderIcon()}
      </View>

      <Text variant="title" className="font-heading text-ink text-center mb-2">
        {title}
      </Text>

      <Text variant="body" tone="muted" className="text-center mb-6">
        {message}
      </Text>

      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          loading={action.loading}
        />
      ) : null}
    </View>
  );
}

