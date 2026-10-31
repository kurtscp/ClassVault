import {
  Pressable,
  type GestureResponderEvent,
  type ViewProps,
  View,
} from 'react-native';

export interface CardProps extends ViewProps {
  onPress?: (event: GestureResponderEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Surface container for elevated content blocks.
 * Employs locked 16px radius, border-line, and single standard card shadow (BR-1).
 */
export function Card({
  onPress,
  className = '',
  children,
  ...rest
}: CardProps) {
  const baseClasses =
    `bg-white rounded-card border border-line shadow-card p-4 ${className}`.trim();

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className={`${baseClasses} active:opacity-95`}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClasses} {...rest}>
      {children}
    </View>
  );
}

