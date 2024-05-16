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

const ICON_SIZE = 45;
const ICON_RADIUS = 4;

const VideoThumbnail = ({ file }: { file: DirItem }) => {
  const fallbackThumbnail =
    'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  useEffect(() => {
    FileApi.makeVideoPreview(file).then(setThumbnail).catch(console.info);
  }, []);
  return (
    <ImageBackground
      source={{ uri: thumbnail ?? fallbackThumbnail }}
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: ICON_RADIUS,
        overflow: 'hidden',
      }}>
      <Icon size={25} color={'#fff'} source={'play-circle'} />
    </ImageBackground>
  );
};

const DirectoryItemView: React.FC<DirItemProps> = ({ item }) => {
  const homeCtx = useHomeContext();
  return (
    <List.Item
      style={item.isDirectory() ? styles.folder : styles.file}
      title={item.name}
      titleStyle={{
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.fileTitleColor,
      }}
      descriptionStyle={{ fontSize: 12, color: theme.fileDescriptionColor }}
      description={item.mtime?.toLocaleDateString() ?? ''}
      left={() =>
        FileApi.isFileImage(item) ? (
          <Image
            source={{ uri: `file://${item.path}` }}
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              borderRadius: ICON_RADIUS,
            }}
          />
        ) : FileApi.isFileVideo(item) ? (
          <VideoThumbnail file={item} />
        ) : (
          <View style={{ borderRadius: ICON_RADIUS }}>
            <Icon
              size={ICON_SIZE}
              color={item.isDirectory() ? theme.folderColor : theme.fileColor}
              source={item.isDirectory() ? 'folder' : 'file'}
            />
          </View>
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
