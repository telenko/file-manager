import React, { forwardRef, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  withDelay,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Icon } from 'react-native-paper';

const SCROLL_WAIT_TIME = 50;

export interface ScrolledDateIndicatorRef {
  setProgress: (progress: number) => void;
}

interface Props {
  dateStartMs: SharedValue<number>;
  clamped: SharedValue<number>;
  dateEndMs: SharedValue<number>;
  isUserDragging: SharedValue<number>;
  scrollY: SharedValue<number>;
  contentHeight: SharedValue<number>;
  layoutHeight: SharedValue<number>;
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
>(
  (
    {
      dateStartMs,
      dateEndMs,
      onScroll,
      scrollY,
      contentHeight,
      layoutHeight,
      isUserDragging,
      clamped,
    },
    ref,
  ) => {
    const containerHeight = useSharedValue(1);
    const containerTop = useSharedValue(0);
    const MONTHS = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const [text, setText] = useState('');
    // === DATE CALCULATION ===
    useDerivedValue(() => {
      const timestamp = dateStartMs.value; // 👈 shared value
      if (!timestamp) return '';

      const d = new Date(timestamp);
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      runOnJS(setText)(`${month} ${year}`);
      return `${month} ${year}`;
    });
    // === GESTURE ===
    const panGesture = Gesture.Pan()
      .onBegin(() => {
        isUserDragging.value = 1;
      })
      .onUpdate(e => {
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
              Math.min(
                Math.max(scrollY.value, 30),
                containerHeight.value - 20,
              ) - 24,
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
      opacity: withTiming(isUserDragging.value === 1 ? 1 : 0, {
        duration: 150,
      }),
      transform: [
        {
          translateY:
            Math.min(Math.max(scrollY.value, 30), containerHeight.value - 20) -
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

    return (
      <Animated.View
        ref={containerRef}
        style={styles.container}
        onLayout={e => {
          containerHeight.value = e.nativeEvent.layout.height;
          containerRef.current?.measureInWindow((x, y, width, height) => {
            containerTop.value = y;
          });
        }}>
        <Animated.View style={[styles.dateBubble, bubbleStyle]}>
          <Animated.Text style={styles.dateText}>{text}</Animated.Text>
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
    );
  },
);

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
