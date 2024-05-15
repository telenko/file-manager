import React, { useEffect, useMemo } from 'react';
import { Image, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { DirItem } from '../../services/FileApi';

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
  return (
    <View>
      {/* <Text>{route.name}</Text>
      <Text>{route.mtime?.toLocaleDateString()}</Text> */}
      <Image
        source={{ uri: `file://${route}` }}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

export default ImagePreviewScreen;
