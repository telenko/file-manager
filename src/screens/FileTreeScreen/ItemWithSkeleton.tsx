import React, { useEffect } from 'react';
import { View } from 'react-native';
import DirectoryGridItemView, {
  SkeletonGridItemView,
} from './DirectoryGridItemView';
import DirectoryItemView, { SkeletonItemView } from './DirectoryItemView';
import { useScrollIndicator } from '../../common/components/ScrollIndicator/ScrollIndicatorProvider';

export const ItemWithSkeleton = React.memo(({ layout, item }: any) => {
  const { isUserDragging } = useScrollIndicator();
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
});
