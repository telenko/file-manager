import React, { useEffect, useState } from 'react';
import { Dimensions, Image, View } from 'react-native';
import { Text } from 'react-native-paper';
import { DirItem, FileApi } from '../../services/FileApi';

export type ImageViewerScreenProps = {
  route: { params: { route: string } };
};

const ImagePreviewScreen: React.FC<ImageViewerScreenProps> = ({
  route: {
    params: { route },
  },
}) => {
  if (!route) {
    return null;
  }
  const { width, height } = Dimensions.get('window');
  const [file, setFile] = useState<DirItem | null>(null);
  useEffect(() => {
    FileApi.getMetadata(route).then(setFile);
  }, []);
  return (
    <View>
      <Text>{file?.mtime?.toLocaleDateString()}</Text>
      <Text>{file?.mtime?.toLocaleTimeString()}</Text>
      <Image source={{ uri: `file://${route}` }} style={{ width, height }} />
    </View>
  );
};

export default ImagePreviewScreen;
