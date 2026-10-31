import React from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode | React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  trend?: string;
  className?: string;
  onPress?: () => void;
}

/**
 * Metric card for analytics dashboards.
 * Pairs high-contrast numeric values with descriptive captions and visual trends (BR-1, UX-4).
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  className = '',
  onPress,
}: StatCardProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{
        size?: number;
        strokeWidth?: number;
        className?: string;
      }>;
      return <IconComponent size={20} strokeWidth={1.75} className="text-brand" />;
    }
    return null;
  };

  return (
    <Card onPress={onPress} className={`p-4 ${className}`.trim()}>
      <View className="flex-row items-center justify-between mb-2">
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        {icon ? (
          <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center -my-1 -mr-1">
            {renderIcon()}
          </View>
        ) : null}
      </View>

      <Text variant="h2" className="font-display text-ink">
        {String(value)}
      </Text>

      {trend ? (
        <Text variant="small" tone="secondary" className="mt-1.5">
          {trend}
        </Text>
      ) : null}
    </Card>
  );
}

