import React, { useEffect } from 'react';
import Animated from 'react-native-reanimated';
import { View } from 'react-native';
import DirectoryGridItemView, {
  SkeletonGridItemView,
} from './DirectoryGridItemView';
import DirectoryItemView, { SkeletonItemView } from './DirectoryItemView';

type Props = {
  isUserDragging: Animated.SharedValue<number>;
  SkeletonComponent: React.ComponentType<any>;
  children: React.ReactNode;
};

export const ItemWithSkeleton = React.memo(
  ({ isUserDragging, layout, item }: any) => {
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
