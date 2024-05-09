import React from 'react';
import { StyleSheet } from 'react-native';
import { List } from 'react-native-paper';
import {
  FileApi,
  type DirItem as DirectoryItemType,
} from '../../../services/FileApi';
import { useHomeContext } from '../HomeScreenContext';
import { Icon } from 'react-native-paper';

type DirItemProps = {
  item: DirectoryItemType;
};

const DirectoryItemView: React.FC<DirItemProps> = ({ item }) => {
  const homeCtx = useHomeContext();
  return (
    <List.Item
      style={item.isDirectory() ? styles.folder : styles.file}
      title={item.name}
      left={() => (
        <Icon size={30} source={item.isDirectory() ? 'folder' : 'file'} />
      )}
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

export default DirectoryItemView;
