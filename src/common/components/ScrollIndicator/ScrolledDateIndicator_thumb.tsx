import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  useAnimatedReaction,
  withDelay,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Icon } from 'react-native-paper';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import dayjs from 'dayjs';
import { useScrollIndicator } from './ScrollIndicatorProvider';

const hapticFallbackOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};
const selectVibrate = () => {
  ReactNativeHapticFeedback.trigger('impactLight', hapticFallbackOptions);
};

const SCROLL_WAIT_TIME = 50;

export interface ScrolledDateIndicatorRef {
  setProgress: (progress: number) => void;
}

interface Props {
  onScroll?: (progress: number) => void; // викликається коли юзер тягне повзунок
}

const HIT_SLOP_WIDTH = 30; // draggable area
const THUMB_THIN_WIDTH = 6; // default visual width
const THUMB_EXPANDED_WIDTH = 30; // while dragging
const INDICATOR_WIDTH = 28;
const DATE_BUBBLE_WIDTH = 90;

export const ScrolledDateIndicator = forwardRef<
  ScrolledDateIndicatorRef,
  Props
>(({ onScroll }, ref) => {
  const {
    dateMs: dateStartMs,
    clamped,
    contentHeight,
    isUserDragging,
    layoutHeight,
    scrollY,
  } = useScrollIndicator();
  const containerHeight = useSharedValue(1);
  const containerTop = useSharedValue(0);

  const [timestamp, setTimestamp] = useState<number | null>(null);
  const timeBubbleText = useMemo(() => {
    if (!timestamp) return '';
    return dayjs(timestamp).format('MMM YYYY');
  }, [timestamp]);
  // === DATE CALCULATION ===
  useDerivedValue(() => {
    const timestamp = dateStartMs.value; // 👈 shared value
    if (!timestamp) {
      return;
    }
    runOnJS(setTimestamp)(timestamp);
    return timestamp;
  });
  // === GESTURE ===
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (isUserDragging.value !== 1) {
        isUserDragging.value = 1;
      }
      const calcY = e.absoluteY - containerTop.value;
      const resolvedY = Math.min(Math.max(calcY, 0), containerHeight.value);
      scrollY.value = resolvedY;
      Math.min(Math.max(resolvedY, 30), containerHeight.value - 20);
      clamped.value = Math.max(
        0,
        Math.min(1, resolvedY / containerHeight.value),
      );
    })
    .onEnd(() => {
      isUserDragging.value = withDelay(400, withTiming(0));
    });

  // === INDICATOR POSITION ===
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY:
            Math.min(Math.max(scrollY.value, 30), containerHeight.value - 40) -
            24,
        },
      ], // center on finger
      opacity: withTiming(isUserDragging.value === 1 ? 1 : 0.5, {
        duration: 180,
      }),
    };
  });

  const lastSent = useSharedValue(0);
  const whiteListClamped = [0, 1];
  const lastSentProgress = useSharedValue(0);

  useAnimatedReaction(
    () => clamped.value,
    clamped => {
      const now = Date.now();

      if (
        (whiteListClamped.includes(clamped) &&
          clamped !== lastSentProgress.value) ||
        now - lastSent.value > SCROLL_WAIT_TIME
      ) {
        // ~30 FPS
        lastSent.value = now;
        lastSentProgress.value = clamped;
        // @ts-ignore
        runOnJS(onScroll)(clamped);
      }
    },
  );

  // === DATE BUBBLE ===
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: withTiming(
      isUserDragging.value === 1 && dateStartMs.value ? 1 : 0,
      {
        duration: 150,
      },
    ),
    transform: [
      {
        translateY:
          Math.min(Math.max(scrollY.value, 30), containerHeight.value - 40) -
          14,
      },
      {
        scale: withTiming(isUserDragging.value === 1 ? 1 : 0.8, {
          duration: 150,
        }),
      },
    ],
  }));

  const containerRef = useRef<Animated.View>(null);

  const isContainerReady = useSharedValue(false);

  const prepareContainer = () => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      containerTop.value = y;
      isContainerReady.value = true;
    });
  };

  const containerStyles = useAnimatedStyle(() => ({
    opacity: isContainerReady.value ? 1 : 0,
  }));

  useEffect(() => {
    if (timeBubbleText && isUserDragging.value === 1) {
      selectVibrate();
    }
  }, [timeBubbleText]);

  return (
    <View style={[{ position: 'absolute', top: 0, right: -10, bottom: 0 }]}>
      <Animated.View
        ref={containerRef}
        style={[styles.container, containerStyles]}
        onLayout={e => {
          containerHeight.value = e.nativeEvent.layout.height;
          prepareContainer();
        }}>
        <Animated.View style={[styles.dateBubble, bubbleStyle]}>
          <Animated.Text style={styles.dateText}>
            {timeBubbleText}
          </Animated.Text>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.indicator, indicatorStyle]}>
            <Icon
              source="drag-vertical"
              size={25}
              color="rgba(255,255,255,0.9)"
            />
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: HIT_SLOP_WIDTH,
    alignItems: 'flex-end', // 👈 keeps visual thumb on the edge
    justifyContent: 'flex-start',
  },
  indicator: {
    position: 'absolute',
    right: 5,
    height: 48,
    width: THUMB_EXPANDED_WIDTH,
    borderRadius: 24,
    backgroundColor: '#999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBubble: {
    position: 'absolute',
    right: INDICATOR_WIDTH + 8,
    width: DATE_BUBBLE_WIDTH,
    paddingVertical: 6,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: '#222',
    alignItems: 'center',
  },
  dateText: {
    color: 'white',
    fontWeight: '600',
  },
});
