import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { RecyclerListView } from 'recyclerlistview';
import { useScrollIndicator } from './ScrollIndicatorProvider';
import { View } from 'react-native';
import { ScrolledDateIndicator } from './ScrolledDateIndicator_thumb';

const AnimatedRecyclerListView =
  Animated.createAnimatedComponent(RecyclerListView);

export type ScrollableRecyclerListViewRef = {
  forceRerender: () => void;
  scrollToOffset: RecyclerListView<any, any>['scrollToOffset'];
};

export const ScrollableRecyclerListView = forwardRef<
  ScrollableRecyclerListViewRef,
  React.ComponentProps<typeof RecyclerListView> & {
    timestamps: (number | undefined)[];
    minIndicatorFactor?: number;
    scrollKey?: string;
  }
>(
  (
    {
      timestamps,
      minIndicatorFactor = 3,
      scrollKey,
      ...props
    },
    forwardedRef,
  ) => {
    const ref = useRef<RecyclerListView<any, any>>(null);
    const [indicatorVisible, setIndicatorVisible] = React.useState(false);
    const scrollOffsetRef = useRef(0);
    const ignoreScrollResetRef = useRef(false);
    const {
      layoutHeight,
      contentHeight,
      scrollY,
      isUserDragging,
      clamped,
      dateMs,
    } = useScrollIndicator();

    useImperativeHandle(
      forwardedRef,
      () => ({
        forceRerender: () => ref.current?.forceRerender(),
        scrollToOffset: (...args) => ref.current?.scrollToOffset(...args),
      }),
      [],
    );

    const saveScrollOffset = useCallback((offset: number) => {
      if (ignoreScrollResetRef.current && offset === 0) {
        return;
      }
      scrollOffsetRef.current = offset;
    }, []);

    const restoreScrollOffset = useCallback(() => {
      const offset = scrollOffsetRef.current;
      if (offset <= 0) {
        return;
      }

      ignoreScrollResetRef.current = true;
      ref.current?.scrollToOffset(0, offset, false);
      requestAnimationFrame(() => {
        ignoreScrollResetRef.current = false;
      });
    }, []);

    useLayoutEffect(() => {
      scrollOffsetRef.current = 0;
    }, [scrollKey]);

    const scrollHandler = useAnimatedScrollHandler({
      onScroll: e => {
        if (isUserDragging.value === 1) {
          return;
        }

        runOnJS(saveScrollOffset)(e.contentOffset.y);
        scrollY.value =
          (e.contentOffset.y / e.contentSize.height) *
          e.layoutMeasurement.height;
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
      scrollOffsetRef.current = offset;
      ref?.current?.scrollToOffset(0, offset, true);
    }, []);

    const handleScrollViewLayout = useCallback(
      (e: any) => {
        layoutHeight.value = e.nativeEvent.layout.height;
        // @ts-ignore
        props.scrollViewProps?.onLayout?.(e);
        requestAnimationFrame(restoreScrollOffset);
      },
      [layoutHeight, props.scrollViewProps, restoreScrollOffset],
    );

    const handleContentSizeChange = useCallback(
      (_: any, h: number) => {
        contentHeight.value = h;
        // @ts-ignore
        props.scrollViewProps?.onContentSizeChange?.(_, h);
        requestAnimationFrame(restoreScrollOffset);
      },
      [contentHeight, props.scrollViewProps, restoreScrollOffset],
    );

    const handleVisibleIndicesChanged = useCallback(
      (indices: number[], ...rest: any[]) => {
        const visibleCount = indices.length;
        const totalCount = timestamps.length;
        const shouldShow = totalCount >= visibleCount * minIndicatorFactor;
        setIndicatorVisible(current => (current === shouldShow ? current : shouldShow));
        // @ts-ignore
        props.onVisibleIndicesChanged?.(indices, ...rest);
      },
      [minIndicatorFactor, timestamps.length, props.onVisibleIndicesChanged],
    );

    const scrollViewProps = useMemo(
      () => ({
        ...props.scrollViewProps,
        showsVerticalScrollIndicator: false,
        showsHorizontalScrollIndicator: false,
        onLayout: handleScrollViewLayout,
        onContentSizeChange: handleContentSizeChange,
      }),
      [
        handleContentSizeChange,
        handleScrollViewLayout,
        props.scrollViewProps,
      ],
    );

    return (
      <View style={{ position: 'relative', flex: 1 }}>
        <AnimatedRecyclerListView
          {...props}
          onVisibleIndicesChanged={handleVisibleIndicesChanged}
          scrollViewProps={scrollViewProps}
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
  },
);
