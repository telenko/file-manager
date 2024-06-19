import React, { useEffect, useRef } from 'react';
import { Dimensions, View, VirtualizedList } from 'react-native';
import { useAnimatedRef } from 'react-native-reanimated';

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
  const scrollViewRef = useAnimatedRef();

  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const nextIndex = items.findIndex(it => getItemKey(it) === selectedItemKey);
    setTimeout(() => {
      // @ts-ignore
      scrollViewRef.current.scrollToIndex({
        index: Math.max(nextIndex, 0),
        animated: false,
      });
    }, 0);
  }, [items, selectedItemKey]);

  return (
    <VirtualizedList
      horizontal
      // @ts-ignore
      ref={scrollViewRef}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
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
      onViewableItemsChanged={info => {
        const newIdx =
          info.viewableItems.filter(i => i.isViewable)?.[0]?.index ?? 0;
        onItemOpen?.(itemsRef.current[newIdx]);
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
