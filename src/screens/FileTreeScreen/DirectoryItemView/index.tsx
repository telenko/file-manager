import React, { useEffect, useRef, useState } from 'react';
import { Image, ImageBackground, StyleSheet, View } from 'react-native';
import { IconButton, List, Menu } from 'react-native-paper';

import {
  DirItem,
  FileApi,
  type DirItem as DirectoryItemType,
} from '../../../services/FileApi';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme';
import { useTranslation } from 'react-i18next';
import { FileGuiHelper } from '../../../services/FileGuiHelper';
import { useNavigation } from '../../../common/hooks/useNavigation';
import { Cache } from '../../../services/Cache';
import { useFileManager } from '../../../widgets/FileManagerContext';

type DirItemProps = {
  item: DirectoryItemType;
};

const ICON_SIZE = 45;
const ICON_RADIUS = 4;
const MENU_ICON_SIZE = 30;

const VideoThumbnail = ({ file }: { file: DirItem }) => {
  const fallbackThumbnail =
    'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const makeThumbnailAllowed = useRef<boolean>(false);
  useEffect(() => {
    (async () => {
      // @ts-ignore
      await new Promise(r => setTimeout(r, 600));
      if (makeThumbnailAllowed.current) {
        const cachedPreview = Cache.getVideoPreview(file.path);
        if (cachedPreview) {
          setThumbnail(cachedPreview);
        } else {
          FileApi.makeVideoPreview(file)
            .then(setThumbnail)
            .catch(() => {});
        }
      }
    })();
    return () => {
      makeThumbnailAllowed.current = false;
    };
  }, []);
  return (
    <ImageBackground
      onLayout={() => (makeThumbnailAllowed.current = true)}
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
  const fileManager = useFileManager();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <List.Item
      style={item.isDirectory() ? styles.folder : styles.file}
      title={item.name}
      titleStyle={{
        fontSize: 16,
        color: theme.fileTitleColor,
        fontFamily: theme.mediumText,
      }}
      descriptionStyle={{
        fontSize: 12,
        color: theme.fileDescriptionColor,
        fontFamily: theme.regularText,
      }}
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
        ) : FileApi.isFileMusical(item) ? (
          <View style={{ borderRadius: ICON_RADIUS }}>
            <Icon
              size={ICON_SIZE}
              source={'file-music'}
              color={theme.musicalFileColor}
            />
          </View>
        ) : item.path?.endsWith('.pdf') ? (
          <View style={{ borderRadius: ICON_RADIUS }}>
            <Icon
              size={ICON_SIZE}
              source={'file-pdf-box'}
              color={theme.pdfFileColor}
            />
          </View>
        ) : /\.docx?$/i.test(item.path ?? '') ? (
          <View style={{ borderRadius: ICON_RADIUS }}>
            <Icon
              size={ICON_SIZE}
              source={'file-word'}
              color={theme.docFileColor}
            />
          </View>
        ) : /\.xlsx?$/i.test(item.path ?? '') ? (
          <View style={{ borderRadius: ICON_RADIUS }}>
            <Icon
              size={ICON_SIZE}
              source={'file-excel'}
              color={theme.xlxFileColor}
            />
          </View>
        ) : FileApi.isFileArchive(item) ? (
          <View style={{ borderRadius: ICON_RADIUS }}>
            <Icon
              size={ICON_SIZE}
              source={'archive-arrow-down'}
              color={theme.archiveFileColor}
            />
          </View>
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
      right={() => (
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <IconButton
              onPress={() => setMenuOpen(true)}
              size={MENU_ICON_SIZE}
              // @TODO Andrii - is there a way to make it cleaner?
              style={{ marginRight: -20, height: MENU_ICON_SIZE }}
              icon={'dots-vertical'}
              iconColor={theme.fileMenuColor}
            />
          }>
          <Menu.Item
            disabled={item.isDirectory()}
            onPress={() => {
              FileApi.shareFile(item);
              setMenuOpen(false);
            }}
            title={t('share')}
          />
          <Menu.Item
            disabled={item.isDirectory()}
            onPress={() => {
              FileApi.openFile(item);
              setMenuOpen(false);
            }}
            title={t('openWith')}
          />
          <Menu.Item
            onPress={() => {
              FileGuiHelper.copyContent(item, navigation);
              setMenuOpen(false);
            }}
            title={t('copy')}
          />
          <Menu.Item
            onPress={() => {
              FileGuiHelper.moveContent(item, navigation);
              setMenuOpen(false);
            }}
            title={t('move')}
          />
          <Menu.Item
            onPress={() => {
              FileGuiHelper.deleteContent(item).then(isDone => {
                if (isDone) {
                  fileManager.setReloadRequired(true);
                }
              });
              setMenuOpen(false);
            }}
            title={t('delete')}
          />
        </Menu>
      )}
      onLongPress={() => {
        setMenuOpen(true);
      }}
      onPress={() => {
        if (item.isFile()) {
          if (FileApi.isFileImage(item)) {
            FileGuiHelper.openPreview(item, navigation);
          } else {
            FileApi.openFile(item);
          }
        } else {
          FileGuiHelper.openDirectory(item, navigation);
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
