import { Pressable, View } from 'react-native';
import { Text } from './Text';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Segmented control for toggling between 2-3 mutually exclusive views.
 * Adheres to accessible tablist roles and locked emerald palette tokens (BR-1).
 */
export function Segmented({
  options,
  value,
  onChange,
  className = '',
}: SegmentedProps) {
  return (
    <View
      accessibilityRole="tablist"
      className={`bg-emerald-50 p-1 rounded-control flex-row items-center ${className}`.trim()}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center justify-center min-h-11 py-2 px-3 rounded-control ${
              isSelected ? 'bg-white shadow-card' : 'bg-transparent'
            }`}
          >
            <Text
              variant="body"
              className={
                isSelected ? 'font-heading text-ink' : 'font-body text-fg-muted'
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

