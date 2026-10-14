import React, { useEffect } from 'react';
import { View } from 'react-native';
import DirectoryGridItemView, {
  SkeletonGridItemView,
} from './DirectoryGridItemView';
import DirectoryItemView, { SkeletonItemView } from './DirectoryItemView';
import { SharedValue } from 'react-native-reanimated';

export const ItemWithSkeleton = React.memo(
  ({
    layout,
    item,
    isUserDragging,
  }: {
    layout: 'list' | 'grid';
    item: any;
    isUserDragging: SharedValue<number>;
  }) => {
    const [skeletonShown, setSkeletonShown] = React.useState(
      isUserDragging.value === 1,
    );

    const hideSkeleton = () => {
      setTimeout(() => {
        if (skeletonShown) {
          setSkeletonShown(false);
        }
      }, 400);
    };

    useEffect(() => {
      if (skeletonShown) {
        hideSkeleton();
      }
    }, []);

    return (
      <View>
        {skeletonShown ? (
          layout === 'grid' ? (
            <SkeletonGridItemView />
          ) : (
            <SkeletonItemView />
          )
        ) : null}
        {!skeletonShown ? (
          layout === 'grid' ? (
            <DirectoryGridItemView item={item} />
          ) : (
            <DirectoryItemView item={item} />
          )
        ) : null}
      </View>
    );
  },
);
