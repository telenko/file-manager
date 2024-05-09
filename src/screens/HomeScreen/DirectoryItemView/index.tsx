import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { List } from 'react-native-paper';
import {
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

const DirectoryItemView: React.FC<DirItemProps> = ({ item }) => {
  const homeCtx = useHomeContext();
  return (
    <List.Item
      style={item.isDirectory() ? styles.folder : styles.file}
      title={item.name}
      left={() =>
        FileApi.isFileImage(item) ? (
          <Image
            source={{ uri: `file://${item.path}` }}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
          />
        ) : (
          <Icon
            size={ICON_SIZE}
            color={item.isDirectory() ? theme.folderColor : theme.fileColor}
            source={item.isDirectory() ? 'folder' : 'file'}
          />
        )
      }
      onPress={() => {
        if (item.isFile()) {
          FileApi.openFile(item);
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
