import { Platform, ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  scroll?: boolean;
  edges?: readonly Edge[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * Top-level screen container.
 * Manages safe-area insets, locked canvas background, and responsive centered web column (BR-1).
 */
export function Screen({
  scroll = false,
  edges = ['top', 'left', 'right'],
  className = '',
  children,
  ...rest
}: ScreenProps) {
  const isWeb = Platform.OS === 'web';
  const columnClass = isWeb ? 'w-full max-w-column self-center' : 'w-full';

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-canvas">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`p-4 pb-12 flex-grow ${columnClass} ${className}`.trim()}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 p-4 ${columnClass} ${className}`.trim()} {...rest}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

