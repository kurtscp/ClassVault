import { useState } from 'react';
import {
  Platform,
  Pressable,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerClassName?: string;
}

/**
 * Controlled input field with accessible label, validation feedback,
 * and secure entry toggle (UX-4, BR-1).
 */
export function Input({
  label,
  helperText,
  errorText,
  secureTextEntry,
  containerClassName = '',
  className = '',
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const hasError = Boolean(errorText);
  const isSecure = Boolean(secureTextEntry);
  const effectiveSecure = isSecure && !isPasswordVisible;

  // Active border state calculation
  const borderClass = hasError
    ? 'border-danger'
    : isFocused
    ? 'border-brand'
    : 'border-line';

  // Web focus ring tokens
  const webRingClass =
    Platform.OS === 'web' && isFocused && !hasError
      ? 'outline-none ring-2 ring-brand'
      : '';

  return (
    <View className={`w-full ${containerClassName}`.trim()}>
      {label ? (
        <Text variant="small" className="font-heading text-fg mb-1.5">
          {label}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center border rounded-control bg-white min-h-12 px-3 ${borderClass} ${webRingClass}`.trim()}
      >
        <TextInput
          secureTextEntry={effectiveSecure}
          className={`flex-1 font-body text-body text-fg py-2.5 ${className}`.trim()}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          placeholderClassName="text-fg-muted"
          {...rest}
        />

        {isSecure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? 'Hide password' : 'Show password'
            }
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            className="w-11 h-11 items-center justify-center -mr-2"
          >
            {isPasswordVisible ? (
              <EyeOff size={20} strokeWidth={1.75} className="text-fg-muted" />
            ) : (
              <Eye size={20} strokeWidth={1.75} className="text-fg-muted" />
            )}
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <Text variant="caption" tone="danger" className="mt-1">
          {errorText}
        </Text>
      ) : helperText ? (
        <Text variant="caption" tone="muted" className="mt-1">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
