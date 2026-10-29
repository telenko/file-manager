import React from 'react';
import { DirItem } from '../../../services/FileApi';
import { StyleSheet, View } from 'react-native';
import { ImageZoom } from './ImageZoom';
export { ImageZoom } from './ImageZoom';
export { ZOOM_TYPE } from './ImageZoomTypes';
export type { ImageZoomProps, ZoomType } from './ImageZoomTypes';

const ImageViewer: React.FC<{
  file: Partial<DirItem>;
  onZoomChange?: (scale: number) => void;
}> = ({ file, onZoomChange }) => {
  return (
    <View style={{ width: '100%', height: '100%', flexDirection: 'column' }}>
      <ImageZoom
        uri={`file://${file.path}`}
        minScale={0.5}
        maxScale={12}
        doubleTapScale={3}
        // isSingleTapEnabled
        isDoubleTapEnabled
        isPanEnabled
        onZoomChange={onZoomChange}
        style={[styles.image, { width: '100%', height: '100%' }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  image: {
    flex: 1,
  },
});

export default ImageViewer;
