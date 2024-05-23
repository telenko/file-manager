import React, { useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DirItem } from '../../../services/FileApi';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { ImageZoom, ZOOM_TYPE } from '@likashefqet/react-native-image-zoom';

const { width, height } = Dimensions.get('window');
const SCREEN_WIDTH = width;
const SCREEN_HEIGHT = height;

const ImageViewer: React.FC<{
  file: Partial<DirItem>;
  onZooming?: (zooming: boolean) => void;
}> = ({ file, onZooming }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      // runOnJS(ctx.onZooming)(true);
    })
    .onUpdate(e => {
      scale.value = Math.max(savedScale.value * e.scale, 1);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // runOnJS(ctx.onZooming)(false);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translationX.value = withSpring(0);
        translationY.value = withSpring(0);
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(e => {
      panStartX.value = e.translationX;
      panStartY.value = e.translationY;
    })
    .onUpdate(e => {
      const deltaX = e.translationX - panStartX.value;
      const deltaY = e.translationY - panStartY.value;

      const newTranslationX = translationX.value + deltaX;
      const newTranslationY = translationY.value + deltaY;

      const imageWidth = SCREEN_WIDTH * scale.value;
      const imageHeight = SCREEN_HEIGHT * scale.value;

      const maxTranslationX = (imageWidth - SCREEN_WIDTH) / 2;
      const maxTranslationY = (imageHeight - SCREEN_HEIGHT) / 2;

      translationX.value = Math.max(
        Math.min(newTranslationX, maxTranslationX),
        -maxTranslationX,
      );
      translationY.value = Math.max(
        Math.min(newTranslationY, maxTranslationY),
        -maxTranslationY,
      );
    })
    .onEnd(() => {
      // Here we ensure that the translation values are within boundaries
      const imageWidth = SCREEN_WIDTH * scale.value;
      const imageHeight = SCREEN_HEIGHT * scale.value;

      const maxTranslationX = (imageWidth - SCREEN_WIDTH) / 2;
      const maxTranslationY = (imageHeight - SCREEN_HEIGHT) / 2;

      translationX.value = withSpring(
        Math.max(
          Math.min(translationX.value, maxTranslationX),
          -maxTranslationX,
        ),
      );
      translationY.value = withSpring(
        Math.max(
          Math.min(translationY.value, maxTranslationY),
          -maxTranslationY,
        ),
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value, { stiffness: 100 }) },
      { translateX: translationX.value },
      { translateY: translationY.value },
    ],
  }));

  const [zooming, setZooming] = useState<boolean>(false);
  const sendZooming = (newZooming: boolean) => {
    if (newZooming === zooming) {
      return;
    }
    setZooming(newZooming);
    onZooming?.(newZooming);
  };

  return (
    <View style={{ width, height }}>
      <ImageZoom
        uri={`file://${file.path}`}
        minScale={0.5}
        maxScale={5}
        doubleTapScale={3}
        minPanPointers={1}
        isSingleTapEnabled
        isDoubleTapEnabled
        isPanEnabled={zooming}
        onPinchStart={e => e.scale !== 1 && sendZooming(true)}
        onDoubleTap={zoomType => {
          if (zoomType === ZOOM_TYPE.ZOOM_IN) {
            sendZooming(true);
          } else {
            sendZooming(false);
          }
        }}
        onResetAnimationEnd={() => sendZooming(false)}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );

  // return (
  //   <GestureDetector
  //     gesture={Gesture.Simultaneous(
  //       pinchGesture,
  //       panGesture,
  //       doubleTapGesture,
  //     )}>
  //     <View
  //       style={{
  //         flexDirection: 'column',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //       }}>
  //       <Animated.View style={[styles.imageContainer, animatedStyle]}>
  //         <Image
  //           source={{ uri: `file://${file.path}` }}
  //           style={styles.image}
  //           resizeMode="contain"
  //         />
  //       </Animated.View>
  //     </View>
  //   </GestureDetector>
  // );
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
    height: '100%',
  },
});

export default ImageViewer;
