import React from 'react';
import {
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  ViewStyle,
} from 'react-native';
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
}) => (
  <NativeSubsamplingImageView
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
);