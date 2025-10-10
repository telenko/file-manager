import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type GalleryProps<T> = {
  items: T[];
  getItemKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  selectedItemKey?: string;
  onItemOpen?: (item: T) => void;
};

export default function SimpleGallery<T>({
  items,
  getItemKey,
  renderItem,
  selectedItemKey,
  onItemOpen,
}: GalleryProps<T>) {
  const screen = Dimensions.get('window');

  // === SHARED VALUES ===
  const sharedIndex = useSharedValue(
    selectedItemKey
      ? items.findIndex(i => getItemKey(i) === selectedItemKey)
      : 0,
  );
  const [idx, setIdx] = useState(sharedIndex.value);
  const translateX = useSharedValue(0);
  const isSwiping = useSharedValue(false);
  const itemsLengthShared = useSharedValue(items.length);

  useEffect(() => {
    itemsLengthShared.value = items.length;
  }, [items]);
  const [isSwipingLoc, setSwiping] = useState(false);
  useEffect(() => {
    onItemOpen?.(items[idx]);
  }, [idx]);
  const triggerRerender = () => {
    setTimeout(() => {
      setIdx(sharedIndex.value);
      translateX.value = 0;
      isSwiping.value = false;
      setSwiping(false);
    }, 0);
  };

  const clampIndex = (index: number) =>
    Math.min(Math.max(index, 0), items.length - 1);

  const swipeTo = (dir: 'left' | 'right') => {
    const nextIndex =
      dir === 'left'
        ? clampIndex(sharedIndex.value + 1)
        : clampIndex(sharedIndex.value - 1);

    const target = dir === 'left' ? -screen.width : screen.width;
    isSwiping.value = true;

    translateX.value = withTiming(target, { duration: 100 }, () => {
      sharedIndex.value = nextIndex;
      runOnJS(triggerRerender)();
    });
  };
  const THRESHOLD = 50;
  const panGesture = Gesture.Pan()
    .onBegin(() => {})
    .onUpdate(e => {
      if (!isSwiping.value && Math.abs(e.translationX) > THRESHOLD) {
        isSwiping.value = true;
        runOnJS(setSwiping)(true);
        const dir = e.translationX > 0 ? 'right' : 'left';
      }

      if (isSwiping.value) {
        translateX.value = e.translationX;
      }
    })
    .onEnd(e => {
      const reset = () => {
        translateX.value = withTiming(0, { duration: 150 }, () => {
          isSwiping.value = false;
          runOnJS(setSwiping)(false);
        });
      };
      if (e.translationX < 0 && Math.abs(e.translationX) > THRESHOLD) {
        if ((sharedIndex.value ?? 0) < itemsLengthShared.value - 1) {
          runOnJS(swipeTo)('left');
        } else {
          reset();
        }
      } else if (e.translationX > 0 && Math.abs(e.translationX) > THRESHOLD) {
        if (sharedIndex.value > 0) {
          runOnJS(swipeTo)('right');
        } else {
          reset();
        }
      } else {
        reset();
      }
    });

  // === Animated Styles ===
  const currentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const prevStyle = useAnimatedStyle(() => {
    const translate = translateX.value - screen.width;
    const opacity = interpolate(
      translateX.value,
      [0, screen.width],
      [0.2, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: translate }],
      opacity,
    };
  });

  const nextStyle = useAnimatedStyle(() => {
    const translate = translateX.value + screen.width;
    const opacity = interpolate(
      translateX.value,
      [-screen.width, 0],
      [1, 0.2],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: translate }],
      opacity,
    };
  });

  // === Items to render ===
  const index = idx;
  const prevItem = index > 0 ? items[index - 1] : null;
  const currentItem = items[index];
  const nextItem = index < items.length - 1 ? items[index + 1] : null;

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {isSwipingLoc && prevItem && (
          <Animated.View
            style={[styles.item, prevStyle]}
            key={getItemKey(prevItem)}>
            {renderItem(prevItem)}
          </Animated.View>
        )}

        <Animated.View
          style={[styles.item, currentStyle]}
          key={getItemKey(currentItem)}>
          {renderItem(currentItem)}
        </Animated.View>

        {isSwipingLoc && nextItem && (
          <Animated.View
            style={[styles.item, nextStyle]}
            key={getItemKey(nextItem)}>
            {renderItem(nextItem)}
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  item: { position: 'absolute', width: '100%', height: '100%' },
});
