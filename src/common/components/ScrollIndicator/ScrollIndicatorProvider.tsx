import { useMemo } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

export type ScrollIndicatorContextType = {
  dateMs: SharedValue<number>;
  clamped: SharedValue<number>;
  isUserDragging: SharedValue<number>;
  scrollY: SharedValue<number>;
  contentHeight: SharedValue<number>;
  layoutHeight: SharedValue<number>;
};

export const useScrollIndicatorState = (): ScrollIndicatorContextType => {
  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(1);
  const layoutHeight = useSharedValue(1);
  const dateMs = useSharedValue(0);
  const clamped = useSharedValue(0);
  const isUserDragging = useSharedValue(0);

  const value = useMemo(
    () => ({
      dateMs,
      clamped,
      isUserDragging,
      scrollY,
      contentHeight,
      layoutHeight,
    }),
    [clamped, contentHeight, dateMs, isUserDragging, layoutHeight, scrollY],
  );

  return value;
};
