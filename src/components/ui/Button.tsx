import {
  ActivityIndicator,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  View,
} from 'react-native';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  onPress?: (event: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

const CONTAINER_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-action active:bg-action-pressed',
  secondary: 'bg-white border border-line active:bg-emerald-50',
  ghost: 'bg-transparent active:bg-emerald-50',
  danger: 'bg-danger active:opacity-90',
};

const TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-action',
  ghost: 'text-action',
  danger: 'text-white',
};

const SPINNER_COLORS: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-action',
  ghost: 'text-action',
  danger: 'text-white',
};

/**
 * Standard interactive button.
 * Enforces a 48px touch target (UX-4), accessible roles, and locked variant styling (BR-1).
 */
export function Button({
  label,
  variant = 'primary',
  onPress,
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  accessibilityLabel,
  className = '',
  ...rest
}: ButtonProps) {
  const isInactive = disabled || loading;
  const containerClass = CONTAINER_CLASSES[variant];
  const textClass = TEXT_CLASSES[variant];
  const spinnerClass = SPINNER_COLORS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      className={`min-h-12 px-4 py-2.5 rounded-control flex-row items-center justify-center ${containerClass} ${
        fullWidth ? 'w-full' : 'self-start'
      } ${isInactive ? 'opacity-50' : ''} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          className={spinnerClass}
          color={variant === 'primary' || variant === 'danger' ? 'white' : undefined}
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text
            variant="body"
            className={`font-heading ${textClass}`}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

