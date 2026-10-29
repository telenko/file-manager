import { StyleProp, ViewStyle } from 'react-native';

export const ZOOM_TYPE = {
  ZOOM_IN: 'ZOOM_IN',
  ZOOM_OUT: 'ZOOM_OUT',
} as const;

export type ZoomType = (typeof ZOOM_TYPE)[keyof typeof ZOOM_TYPE];

export interface ImageZoomProps {
  uri: string;
  minScale?: number;
  maxScale?: number;
  doubleTapScale?: number;
  minPanPointers?: number;
  isSingleTapEnabled?: boolean;
  isDoubleTapEnabled?: boolean;
  isPanEnabled?: boolean;
  onZoomChange?: (scale: number) => void;
  onPinchStart?: () => void;
  onDoubleTap?: (zoomType: ZoomType) => void;
  onResetAnimationEnd?: () => void;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'contain' | 'cover' | 'center';
}
