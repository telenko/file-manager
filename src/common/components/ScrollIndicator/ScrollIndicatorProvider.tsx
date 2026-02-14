import React, { createContext, PropsWithChildren } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

type ScrollIndicatorContextType = {
  dateMs: SharedValue<number>;
  clamped: SharedValue<number>;
  isUserDragging: SharedValue<number>;
  scrollY: SharedValue<number>;
  contentHeight: SharedValue<number>;
  layoutHeight: SharedValue<number>;
};

const ScrollIndicatorContext = createContext<
  ScrollIndicatorContextType | undefined
>(undefined);

export const ScrollIndicatorProvider: React.FC<PropsWithChildren<any>> = ({
  children,
}) => {
  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(1);
  const layoutHeight = useSharedValue(1);
  const dateMs = useSharedValue(0);
  const clamped = useSharedValue(0);

  return (
    <ScrollIndicatorContext.Provider
      value={{
        dateMs,
        clamped,
        isUserDragging: useSharedValue(0),
        scrollY,
        contentHeight,
        layoutHeight,
      }}>
      {children}
    </ScrollIndicatorContext.Provider>
  );
};

export const useScrollIndicator = () => {
  const context = React.useContext(ScrollIndicatorContext);
  if (!context) {
    throw new Error(
      'useScrollIndicator must be used within a ScrollIndicatorProvider',
    );
  }
  return context;
};
