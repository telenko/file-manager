import React, { useCallback, useLayoutEffect } from 'react';
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { RecyclerListView } from 'recyclerlistview';
import { useScrollIndicator } from './ScrollIndicatorProvider';
import { View } from 'react-native';
import { ScrolledDateIndicator } from './ScrolledDateIndicator_thumb';

const AnimatedRecyclerListView =
  Animated.createAnimatedComponent(RecyclerListView);

export const ScrollableRecyclerListView = ({
  timestamps,
  minIndicatorFactor = 3,
  ...props
}: React.ComponentProps<typeof RecyclerListView> & {
  timestamps: (number | undefined)[];
  minIndicatorFactor?: number;
}) => {
  const ref = React.useRef<RecyclerListView<any, any>>(null);
  const [indicatorVisible, setIndicatorVisible] = React.useState(false);
  const {
    layoutHeight,
    contentHeight,
    scrollY,
    isUserDragging,
    clamped,
    dateMs,
  } = useScrollIndicator();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      if (isUserDragging.value === 1) {
        return;
      }

      scrollY.value =
        (e.contentOffset.y / e.contentSize.height) * e.layoutMeasurement.height;
      contentHeight.value = e.contentSize.height;
      layoutHeight.value = e.layoutMeasurement.height;
    },
  });

  useLayoutEffect(() => {
    setIndicatorVisible(false);
  }, [timestamps]);

  useAnimatedReaction(
    () => clamped.value,
    clamped => {
      if (isUserDragging.value === 1) {
        const index = Math.floor((timestamps.length - 1) * clamped);
        // find first existing timestamp starting from index
        let item: number | undefined = undefined;
        for (let i = index; i < timestamps.length; i++) {
          const t = timestamps[i];
          if (t !== undefined) {
            item = t;
            break;
          }
        }
        dateMs.value = item ?? 0;
      }
    },
    [timestamps],
  );

  const scrollToOffsetPercentage = useCallback((offsetPercentage: number) => {
    const flashListHeight = ref?.current?.getContentDimension().height ?? 1;
    const offset = offsetPercentage * flashListHeight;
    ref?.current?.scrollToOffset(0, offset, true);
  }, []);

  return (
    <View style={{ position: 'relative', flex: 1 }}>
      <AnimatedRecyclerListView
        {...props}
        onVisibleIndicesChanged={(indices, b, c) => {
          const visibleCount = indices.length;
          const totalCount = timestamps.length;
          const shouldShow = totalCount >= visibleCount * minIndicatorFactor;
          setIndicatorVisible(shouldShow);
          props.onVisibleIndicesChanged?.(indices, b, c);
        }}
        scrollViewProps={{
          ...props.scrollViewProps,
          showsVerticalScrollIndicator: false,
          showsHorizontalScrollIndicator: false,
          onLayout: (e: any) => {
            layoutHeight.value = e.nativeEvent.layout.height;
            // @ts-ignore
            props.scrollViewProps?.onLayout?.(e);
          },
          onContentSizeChange: (_: any, h: number) => {
            contentHeight.value = h;
            // @ts-ignore
            props.scrollViewProps?.onContentSizeChange?.(_, h);
          },
        }}
        // @ts-ignore
        onScroll={scrollHandler}
        // @ts-ignore
        ref={ref}
        scrollEventThrottle={16}
      />
      {indicatorVisible ? (
        <ScrolledDateIndicator onScroll={scrollToOffsetPercentage} />
      ) : null}
    </View>
  );
};
