import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, VirtualizedList } from 'react-native';
import { useAnimatedRef, useSharedValue } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

function Gallery<T>({
  getItemKey,
  items,
  renderItem,
  selectedItemKey,
}: {
  items: T[];
  renderItem: (v: T) => React.ReactNode;
  getItemKey: (v: T) => string;
  selectedItemKey: string;
  onItemOpen?: (item: T) => void;
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
        animated: true,
      });
    }, 0);
  }, [items, selectedItemKey]);

  const startX = useRef<number>(0);
  const endX = useRef<number>(0);

  return (
    // @ts-ignore
    <VirtualizedList
      horizontal
      ref={scrollViewRef}
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
      onScrollEndDrag={() => {
        console.log('ANIM END');
      }}
      // @ts-ignore
      renderItem={info => {
        // @ts-ignore
        return renderItem(info.item);
      }}
    />
  );
}

export default Gallery;
