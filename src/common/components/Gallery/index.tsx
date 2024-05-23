import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, View, VirtualizedList } from 'react-native';
import { useAnimatedRef, useSharedValue } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

function Gallery<T>({
  getItemKey,
  items,
  renderItem,
  selectedItemKey,
  onItemOpen,
  disableScrolling = false,
}: {
  items: T[];
  renderItem: (v: T) => React.ReactNode;
  getItemKey: (v: T) => string;
  selectedItemKey: string;
  onItemOpen?: (item: T) => void;
  disableScrolling?: boolean;
}) {
  const [index, setIndex] = useState<number | null>(0);
  const scrollViewRef = useAnimatedRef();

  useEffect(() => {
    const nextIndex = items.findIndex(it => getItemKey(it) === selectedItemKey);
    setIndex(nextIndex);
    setTimeout(() => {
      // @ts-ignore
      scrollViewRef.current.scrollToIndex({
        index: Math.max(nextIndex, 0),
        animated: false,
      });
    }, 0);
  }, [items, selectedItemKey]);

  const startX = useRef<number>(0);
  const endX = useRef<number>(0);

  return (
    <VirtualizedList
      horizontal
      // @ts-ignore
      ref={scrollViewRef}
      scrollEnabled={!disableScrolling}
      pagingEnabled
      windowSize={3}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      scrollEventThrottle={16}
      decelerationRate={'fast'}
      disableIntervalMomentum
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      getItem={(_, index) => items[index]}
      getItemCount={() => items.length}
      keyExtractor={getItemKey}
      snapToInterval={width}
      data={items}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      onScrollBeginDrag={event => {
        startX.current = event.nativeEvent.contentOffset.x;
      }}
      onScrollEndDrag={event => {
        endX.current = event.nativeEvent.contentOffset.x;
        const upDown = startX.current > endX.current;
        const newIdx = upDown
          ? Math.max(index! - 1, 0)
          : Math.min(index! + 1, items.length - 1);
        setIndex(newIdx);
        onItemOpen?.(items[newIdx]);
      }}
      // @ts-ignore
      renderItem={info => {
        // @ts-ignore
        return (
          <View style={{ width, overflow: 'hidden' }}>
            {renderItem(info.item)}
          </View>
        );
      }}
    />
  );
}

export default Gallery;
