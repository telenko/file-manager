import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation } from '../../../common/hooks/useNavigation';
import { Cache } from '../../../services/Cache';
import {
  getRouteMetadatas,
  useFileManager,
} from '../../../widgets/FileManager';
import { type FileScreenProps } from '..';

type DirItemProps = {
  item: DirectoryItemType;
};

const ICON_SIZE = 45;
const ICON_RADIUS = 4;
const MENU_ICON_SIZE = 30;
const PREVIEW_SIZE = ICON_SIZE * 2;

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
        const cachedPreview = Cache.getVideoPreview(file.path, PREVIEW_SIZE);
        if (cachedPreview) {
          setThumbnail(cachedPreview);
        } else {
          FileApi.makeVideoPreview(file, PREVIEW_SIZE)
            .then(preview => {
              setThumbnail(preview);
              if (preview) {
                Cache.putVideoPreview(file.path, preview, PREVIEW_SIZE);
              }
            })
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

  const mode = useMemo<FileScreenProps['route']['params']['mode']>(
    () => getRouteMetadatas(navigation)?.mode,
    [navigation],
  );

  const operationsAllowed = mode !== 'copy' && mode !== 'move';

  const menuItems = useMemo(
    () =>
      [
        {
          title: t('share'),
          key: 'share',
          enabled: item.isFile(),
          onPress: () => {
            FileApi.shareFile(item);
          },
        },
        {
          title: t('openWith'),
          key: 'openWith',
          enabled: item.isFile(),
          onPress: () => {
            FileApi.openFile(item);
          },
        },
        {
          title: t('rename'),
          key: 'rename',
          enabled: true,
          onPress: () => {
            fileManager.renameContent(item);
          },
        },
        {
          title: t('copy'),
          key: 'copy',
          enabled: true,
          onPress: () => {
            fileManager.copyContent(item, navigation);
          },
        },
        {
          title: t('move'),
          key: 'move',
          enabled: true,
          onPress: () => {
            fileManager.moveContent(item, navigation);
          },
        },
        {
          title: t('delete'),
          key: 'delete',
          enabled: true,
          onPress: () => {
            fileManager.deleteContent(item).then(isDone => {
              if (isDone) {
                fileManager.setReloadRequired(true);
              }
            });
          },
        },
        {
          title: t('details'),
          key: 'details',
          enabled: item.isFile(),
          onPress: () => {
            fileManager.showFileDetails(item);
          },
        },
      ]
        .filter(menuItem => menuItem.enabled)
        .map(menuItem => ({
          ...menuItem,
          onPress: async () => {
            setMenuOpen(false);
            await new Promise<void>(r => setTimeout(r, 200));
            menuItem.onPress();
          },
        })),
    [item],
  );

  return (
    <List.Item
      style={item.isDirectory() ? styles.folder : styles.file}
      title={item.name}
      disabled={!operationsAllowed && item.isFile()}
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
      right={
        operationsAllowed
          ? () => (
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
                {menuItems.map(menuItem => (
                  <Menu.Item {...menuItem} key={menuItem.key} />
                ))}
              </Menu>
            )
          : () => null
      }
      onLongPress={() => {
        if (!operationsAllowed) {
          return;
        }
        setMenuOpen(true);
      }}
      onPress={() => {
        if (item.isFile()) {
          if (operationsAllowed) {
            if (FileApi.isFileViewable(item)) {
              fileManager.openPreview(item, navigation);
            } else {
              FileApi.openFile(item);
            }
          }
        } else {
          fileManager.openDirectory(item, navigation);
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
