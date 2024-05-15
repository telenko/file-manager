import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { List, Text } from 'react-native-paper';

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

const TH = ({ file }: { file: DirItem }) => {
  useEffect(() => {
    // @ts-ignore
    FileApi.makeVideoPreview(file)?.then(console.log).catch(console.error);
  }, []);
  return <Text>Video</Text>;
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
          <TH file={item} />
        ) : (
          // <VideoPreview
          //   source={{ uri: `file://${item.path}` }}
          //   style={{ width: ICON_SIZE, height: ICON_SIZE }}
          // />
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
