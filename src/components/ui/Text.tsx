import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'caption';

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'brand'
  | 'danger'
  | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<TextVariant, string> = {
  display: 'font-display-xl text-display',
  h1: 'font-display text-h1',
  h2: 'font-display text-h2',
  title: 'font-heading text-title',
  body: 'font-body text-body',
  bodyStrong: 'font-body-semibold text-body',
  small: 'font-body-medium text-small',
  caption: 'font-body text-caption',
};

const TONE_CLASSES: Record<TextTone, string> = {
  default: 'text-fg',
  secondary: 'text-fg-secondary',
  muted: 'text-fg-muted',
  brand: 'text-brand',
  danger: 'text-danger',
  inverse: 'text-white',
};

/**
 * Shared Typography component.
 * Maps typographic tokens to locked brand font families and size scales (BR-2, BR-3).
 */
export function Text({
  variant = 'body',
  tone = 'default',
  className = '',
  children,
  ...rest
}: TextProps) {
  const variantClass = VARIANT_CLASSES[variant];
  const toneClass = TONE_CLASSES[tone];

  return (
    <RNText
      className={`${variantClass} ${toneClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </RNText>
  );
}

