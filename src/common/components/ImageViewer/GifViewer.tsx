import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { DirItem } from '../../../services/FileApi';

const GifViewer: React.FC<{ file: Partial<DirItem> }> = ({ file }) => (
  <Image
    source={{ uri: `file://${file.path}` }}
    resizeMode="contain"
    style={styles.image}
  />
);

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});

export default GifViewer;
