import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  type DimensionValue,
} from 'react-native';

export type SkeletonRounded = 'control' | 'card' | 'full' | 'none';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  rounded?: SkeletonRounded;
  className?: string;
}

const ROUNDED_CLASSES: Record<SkeletonRounded, string> = {
  control: 'rounded-control',
  card: 'rounded-card',
  full: 'rounded-full',
  none: 'rounded-none',
};

/**
 * Placeholder block with subtle breathing pulse for loading views (UX-1).
 * Respects OS reduced-motion preferences.
 */
export function Skeleton({
  width,
  height = 16,
  rounded = 'control',
  className = '',
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Checks web prefers-reduced-motion media query
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setReduceMotion(true);
        return;
      }
    }

    // Checks native accessibility preferences
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted && enabled) {
          setReduceMotion(true);
        }
      })
      .catch(() => {
        // Fallback gracefully to animation if query fails
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity, reduceMotion]);

  const roundedClass = ROUNDED_CLASSES[rounded];

  return (
    <Animated.View
      style={[{ width, height, opacity }]}
      className={`bg-emerald-100 ${roundedClass} ${className}`.trim()}
    />
  );
}

