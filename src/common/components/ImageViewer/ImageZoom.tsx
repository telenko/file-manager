import React, { useRef } from 'react';
import {
  findNodeHandle,
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  UIManager,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
export { ZOOM_TYPE } from './ImageZoomTypes';
export type { ImageZoomProps, ZoomType } from './ImageZoomTypes';
import type { ImageZoomProps, ZoomType } from './ImageZoomTypes';

interface NativeImageZoomProps {
  uri: string;
  minScale: number;
  maxScale: number;
  doubleTapScale: number;
  minPanPointers: number;
  isSingleTapEnabled: boolean;
  isDoubleTapEnabled: boolean;
  isPanEnabled: boolean;
  resizeMode: NonNullable<ImageZoomProps['resizeMode']>;
  style?: StyleProp<ViewStyle>;
  onPinchStart?: () => void;
  onDoubleTap?: (event: NativeSyntheticEvent<{ zoomType: ZoomType }>) => void;
  onResetAnimationEnd?: () => void;
}

const NativeSubsamplingImageView = requireNativeComponent<NativeImageZoomProps>(
  'RNCSubsamplingScaleImageView',
);

const zoomByCommand = 'zoomBy';

export const ImageZoom: React.FC<ImageZoomProps> = ({
  uri,
  minScale = 0.5,
  maxScale = 5,
  doubleTapScale = 3,
  minPanPointers = 1,
  isSingleTapEnabled = true,
  isDoubleTapEnabled = true,
  isPanEnabled = true,
  onPinchStart,
  onDoubleTap,
  onResetAnimationEnd,
  style,
  resizeMode = 'contain',
}) => {
  const nativeImageRef =
    useRef<React.ElementRef<typeof NativeSubsamplingImageView>>(null);

  const zoomBy = (scaleFactor: number, focalX: number, focalY: number) => {
    const reactTag = findNodeHandle(nativeImageRef.current);
    if (reactTag == null) {
      return;
    }

    UIManager.dispatchViewManagerCommand(reactTag, zoomByCommand, [
      scaleFactor,
      focalX,
      focalY,
    ]);
  };

  const pinchGesture = Gesture.Pinch().onChange(event => {
    runOnJS(zoomBy)(event.scaleChange, event.focalX, event.focalY);
  });

  return (
    <GestureDetector gesture={pinchGesture}>
      <NativeSubsamplingImageView
        ref={nativeImageRef}
        uri={uri}
        minScale={minScale}
        maxScale={maxScale}
        doubleTapScale={doubleTapScale}
        minPanPointers={minPanPointers}
        isSingleTapEnabled={isSingleTapEnabled}
        isDoubleTapEnabled={isDoubleTapEnabled}
        isPanEnabled={isPanEnabled}
        resizeMode={resizeMode}
        onPinchStart={onPinchStart}
        onDoubleTap={event => onDoubleTap?.(event.nativeEvent.zoomType)}
        onResetAnimationEnd={onResetAnimationEnd}
        style={style}
      />
    </GestureDetector>
  );
};
