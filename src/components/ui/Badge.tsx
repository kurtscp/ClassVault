import { View, type ViewProps } from 'react-native';
import { Text } from './Text';

export interface BadgeProps extends ViewProps {
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Compact pill badge for categories, chips, and metadata tags (BR-1).
 */
export function Badge({
  label,
  icon,
  className = '',
  ...rest
}: BadgeProps) {
  return (
    <View
      className={`rounded-full bg-emerald-100 px-2.5 py-1 flex-row items-center self-start ${className}`.trim()}
      {...rest}
    >
      {icon ? <View className="mr-1">{icon}</View> : null}
      <Text variant="caption" className="font-body-semibold text-action">
        {label}
      </Text>
    </View>
  );
}

