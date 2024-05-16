import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';

import {
  DirItem,
  FileApi,
  type DirItem as DirectoryItemType,
} from '../../../services/FileApi';
import { useHomeContext } from '../HomeScreenContext';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme';

type DirItemProps = {
  item: DirectoryItemType;
};

const ICON_SIZE = 40;

const VideoThumbnail = ({ file }: { file: DirItem }) => {
  const [thumbnail, setThumbnail] = useState<string>('');
  useEffect(() => {
    // @ts-ignore
    FileApi.makeVideoPreview(file)?.then(setThumbnail).catch(console.error);
  }, []);
  if (!thumbnail) {
    return null;
  }
  return (
    <ImageBackground
      source={{ uri: thumbnail }}
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Icon size={20} color={'#fff'} source={'play-circle'} />
    </ImageBackground>
  );
};

const DirectoryItemView: React.FC<DirItemProps> = ({ item }) => {
  const homeCtx = useHomeContext();
  return (
    <List.Item
      style={item.isDirectory() ? styles.folder : styles.file}
      title={item.name}
      description={item.mtime?.toLocaleDateString() ?? ''}
      left={() =>
        FileApi.isFileImage(item) ? (
          <Image
            source={{ uri: `file://${item.path}` }}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
          />
        ) : FileApi.isFileVideo(item) ? (
          <VideoThumbnail file={item} />
        ) : (
          <Icon
            size={ICON_SIZE}
            color={item.isDirectory() ? theme.folderColor : theme.fileColor}
            source={item.isDirectory() ? 'folder' : 'file'}
          />
        )
      }
      onLongPress={() => {
        if (item.isFile() && FileApi.isFileImage(item)) {
          FileApi.openFile(item);
        }
      }}
      onPress={() => {
        if (item.isFile()) {
          if (FileApi.isFileImage(item)) {
            homeCtx.openPreview(item);
          } else {
            FileApi.openFile(item);
          }
        } else {
          homeCtx.openDirectory(item);
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  folder: {},
  file: {},
});

export default React.memo(DirectoryItemView);
