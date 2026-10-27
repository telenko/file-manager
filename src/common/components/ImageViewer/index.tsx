import React, { useState } from 'react';
import { DirItem } from '../../../services/FileApi';
import { StyleSheet, View } from 'react-native';
import { ImageZoom, ZOOM_TYPE } from './ImageZoom';
export { ImageZoom } from './ImageZoom';
export { ZOOM_TYPE } from './ImageZoomTypes';
export type { ImageZoomProps, ZoomType } from './ImageZoomTypes';

const ImageViewer: React.FC<{
  file: Partial<DirItem>;
  onActive?: (zooming: boolean) => void;
}> = ({ file, onActive }) => {
  const [zooming, setZooming] = useState<boolean>(false);
  const sendZooming = (newZooming: boolean) => {
    if (newZooming === zooming) {
      return;
    }
    setZooming(newZooming);
    onActive?.(newZooming);
  };

  return (
    <View style={{ width: '100%', height: '100%', flexDirection: 'column' }}>
      <ImageZoom
        uri={`file://${file.path}`}
        minScale={0.5}
        maxScale={9}
        doubleTapScale={2}
        // isSingleTapEnabled
        isDoubleTapEnabled
        isPanEnabled
        onPinchStart={() => sendZooming(true)}
        onDoubleTap={zoomType => {
          if (zoomType === ZOOM_TYPE.ZOOM_IN) {
            sendZooming(true);
          } else {
            sendZooming(false);
          }
        }}
        onResetAnimationEnd={() => sendZooming(false)}
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
