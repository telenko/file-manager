import React, { useState } from 'react';
import { DirItem } from '../../../services/FileApi';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ImageZoom, ZOOM_TYPE } from '@likashefqet/react-native-image-zoom';

const { width, height } = Dimensions.get('window');

const ImageViewer: React.FC<{
  file: Partial<DirItem>;
  onZooming?: (zooming: boolean) => void;
}> = ({ file, onZooming }) => {
  const [zooming, setZooming] = useState<boolean>(false);
  const sendZooming = (newZooming: boolean) => {
    if (newZooming === zooming) {
      return;
    }
    setZooming(newZooming);
    onZooming?.(newZooming);
  };

  return (
    <View style={{ width, height: '100%', flexDirection: 'column' }}>
      <ImageZoom
        uri={`file://${file.path}`}
        minScale={0.5}
        maxScale={5}
        doubleTapScale={3}
        minPanPointers={1}
        isSingleTapEnabled
        isDoubleTapEnabled
        isPanEnabled={zooming}
        onPinchStart={() => sendZooming(true)}
        onDoubleTap={zoomType => {
          if (zoomType === ZOOM_TYPE.ZOOM_IN) {
            sendZooming(true);
          } else {
            sendZooming(false);
          }
        }}
        onResetAnimationEnd={() => sendZooming(false)}
        style={styles.image}
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
  imageContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  image: {
    width: width,
    flex: 1,
  },
});

export default ImageViewer;
