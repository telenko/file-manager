import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { DirItem, FileApi } from '../../services/FileApi';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Cache } from '../../services/Cache';
import Gallery from '../../common/components/Gallery';

const { width, height } = Dimensions.get('window');

export type ImageViewerScreenProps = {
  route: { params: { route: string } };
};

const ImagePreviewContext = React.createContext<any>({});

const ImageItem = ({ file }: { file: DirItem }) => {
  const ctx = useContext(ImagePreviewContext);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(ctx.onZooming)(true);
    })
    .onUpdate(e => {
      scale.value = Math.max(savedScale.value * e.scale, 1);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(ctx.onZooming)(false);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { stiffness: 100 }) }],
  }));

  return (
    <GestureDetector gesture={pinchGesture}>
      <View>
        <Text>{file?.name}</Text>
        <Text>{file?.mtime?.toLocaleTimeString()}</Text>
        <Animated.View style={[styles.imageContainer, animatedStyle]}>
          <Image
            source={{ uri: `file://${file.path}` }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

const ImagePreviewScreen: React.FC<ImageViewerScreenProps> = ({
  route: {
    params: { route },
  },
}) => {
  if (!route) {
    return null;
  }
  const [zooming, setZooming] = useState(false);
  const [file, setFile] = useState<DirItem | null>(null);
  const [imagesInFolderSorted, setImagesInFolderSorted] = useState<DirItem[]>(
    [],
  );
  useEffect(() => {
    FileApi.getMetadata(route).then(setFile);
    const dirItems =
      Cache.getDirItems(FileApi.getParentDirectoryPath(route)) ?? [];
    setImagesInFolderSorted(dirItems.filter(FileApi.isFileImage));
  }, []);

  const imagesCarousel = useMemo<DirItem[]>(() => {
    if (!imagesInFolderSorted || imagesInFolderSorted.length === 0) {
      if (!file) {
        return [];
      }
      return [file];
    }
    return imagesInFolderSorted;
  }, [file, imagesInFolderSorted, route]);
  return (
    <ImagePreviewContext.Provider
      value={{
        onZooming: (val: boolean) => {
          setZooming(val);
        },
      }}>
      <Gallery
        items={imagesCarousel}
        getItemKey={it => it.path}
        renderItem={image => <ImageItem file={image} />}
        selectedItemKey={route}
      />
    </ImagePreviewContext.Provider>
  );

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ImagePreviewScreen;
