import React, { forwardRef, useState } from 'react';
import { StyleSheet } from 'react-native';
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

const SCROLL_WAIT_TIME = 50;

export interface ScrolledDateIndicatorRef {
  setProgress: (progress: number) => void;
}

interface Props {
  dateStartMs: SharedValue<number>;
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
    },
    ref,
  ) => {
    const containerHeight = useSharedValue(1);

    const progress = useDerivedValue(() => {
      const maxScroll = contentHeight.value - layoutHeight.value;
      if (maxScroll <= 0) return 0;
      return scrollY.value / maxScroll;
    });
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

    const targetOffsetY = useSharedValue(0);
    // === GESTURE ===
    const panGesture = Gesture.Pan()
      .onBegin(() => {
        isUserDragging.value = 1;
      })
      .onUpdate(e => {
        const clamped = Math.max(0, Math.min(1, e.y / containerHeight.value));

        const maxScroll = contentHeight.value - layoutHeight.value;
        scrollY.value = clamped * maxScroll; // ✅ correct mappin
        targetOffsetY.value = clamped;
      })
      .onEnd(() => {
        isUserDragging.value = withDelay(400, withTiming(0));
      });

    // === INDICATOR POSITION ===
    const indicatorStyle = useAnimatedStyle(() => {
      const top = progress.value * (containerHeight.value - 48);

      return {
        transform: [{ translateY: top }],
        width: withTiming(
          isUserDragging.value ? THUMB_EXPANDED_WIDTH : THUMB_THIN_WIDTH,
          { duration: 180 },
        ),
      };
    });

    const lastSent = useSharedValue(0);

    useAnimatedReaction(
      () => targetOffsetY.value,
      clamped => {
        const now = Date.now();

        if (now - lastSent.value > SCROLL_WAIT_TIME) {
          // ~30 FPS
          lastSent.value = now;
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
        { translateY: progress.value * (containerHeight.value + 10 - 48) },
        {
          scale: withTiming(isUserDragging.value === 1 ? 1 : 0.8, {
            duration: 150,
          }),
        },
      ],
    }));

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={styles.container}
          onLayout={e => {
            containerHeight.value = e.nativeEvent.layout.height;
          }}>
          <Animated.View style={[styles.dateBubble, bubbleStyle]}>
            <Animated.Text style={styles.dateText}>{text}</Animated.Text>
          </Animated.View>

          <Animated.View
            style={[styles.indicator, indicatorStyle]}></Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: 'red',
    width: HIT_SLOP_WIDTH,
    alignItems: 'flex-end', // 👈 keeps visual thumb on the edge
    justifyContent: 'flex-start',
    // marginBottom: -100,
  },
  indicator: {
    position: 'absolute',
    right: 5,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#999',
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
