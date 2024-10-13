import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { IconButton, List, Menu } from 'react-native-paper';

import {
  FileApi,
  type DirItem as DirectoryItemType,
} from '../../../services/FileApi';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../common/hooks/useNavigation';
import {
  getRouteMetadatas,
  useFileManager,
} from '../../../widgets/FileManager';
import { type FileScreenProps } from '..';
import { useFileTreeContext } from '../FileTreeContext';
import { useExceptionHandler } from '../../../common/components/ExceptionHandler';
import VideoThumbnail from '../../../common/components/VideoThumbnail';

type DirItemProps = {
  item: DirectoryItemType;
};

const ICON_SIZE = 45;
const ICON_RADIUS = 4;
const MENU_ICON_SIZE = 30;

const DirectoryItemView: React.FC<DirItemProps> = ({ item }) => {
  const fileManager = useFileManager();
  const fileTreeScreen = useFileTreeContext();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const exceptionHandler = useExceptionHandler();

  const mode: FileScreenProps['route']['params']['mode'] =
    getRouteMetadatas(navigation)?.mode;

  const operationsAllowed = mode !== 'copy' && mode !== 'move';

  const menuItems = useMemo(
    () =>
      [
        {
          title: t('select'),
          icon: 'select',
          key: 'select',
          enabled: true,
          onPress: () => {
            fileTreeScreen.setSelectedPaths([
              ...fileTreeScreen.selectedPaths,
              item.path,
            ]);
          },
        },
        {
          title: t('share'),
          icon: 'share-outline',
          key: 'share',
          enabled: item.isFile(),
          onPress: () => {
            FileApi.shareFile([item]);
          },
        },
        {
          title: t('openWith'),
          icon: 'open-in-app',
          key: 'openWith',
          enabled: item.isFile(),
          onPress: () => {
            FileApi.openFile(item).catch(exceptionHandler.handleError);
          },
        },
        {
          title: t('rename'),
          icon: 'form-textbox',
          key: 'rename',
          enabled: true,
          onPress: () => {
            fileManager.renameContent(item);
          },
        },
        {
          title: t('copy'),
          icon: 'content-copy',
          key: 'copy',
          enabled: true,
          onPress: () => {
            fileManager.copyContent([item], navigation);
          },
        },
        {
          title: t('move'),
          icon: 'file-move-outline',
          key: 'move',
          enabled: true,
          onPress: () => {
            fileManager.moveContent([item], navigation);
          },
        },
        {
          title: t('delete'),
          key: 'delete',
          icon: 'delete-outline',
          enabled: true,
          onPress: () => {
            fileManager.deleteContent([item]).then(isDone => {
              if (isDone) {
                fileManager.setReloadRequired(true);
              }
            });
          },
        },
        {
          title: t('details'),
          key: 'details',
          icon: 'information-outline',
          enabled: true,
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

  const multiSelectActivated = fileTreeScreen.selectedPaths.length > 0;
  const isSelected = fileTreeScreen.selectedPaths.includes(item.path);

  const RIGHT_ICON_OFFSET = -20;

  return (
    <List.Item
      style={styles.item}
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
          <VideoThumbnail
            file={item}
            width={ICON_SIZE}
            iconRadius={ICON_RADIUS}
          />
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
        multiSelectActivated
          ? () => (
              <View style={{ marginRight: RIGHT_ICON_OFFSET }}>
                {/* @TODO Andrii theme */}
                <IconButton
                  style={{
                    width: 25,
                    height: 25,
                  }}
                  size={25}
                  icon={
                    isSelected
                      ? 'check-circle'
                      : 'checkbox-blank-circle-outline'
                  }
                  iconColor="rgb(52,116,235)"
                  onPress={() => {
                    fileTreeScreen.setSelectedPaths(
                      isSelected
                        ? fileTreeScreen.selectedPaths.filter(
                            p => p !== item.path,
                          )
                        : [...fileTreeScreen.selectedPaths, item.path],
                    );
                  }}
                />
              </View>
            )
          : operationsAllowed
          ? () => (
              <Menu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                anchor={
                  <IconButton
                    onPress={() => setMenuOpen(true)}
                    size={MENU_ICON_SIZE}
                    style={{
                      marginRight: RIGHT_ICON_OFFSET,
                      height: MENU_ICON_SIZE,
                    }}
                    icon={'dots-vertical'}
                    iconColor={theme.fileMenuColor}
                  />
                }>
                {menuItems.map(menuItem => (
                  <Menu.Item
                    {...menuItem}
                    key={menuItem.key}
                    leadingIcon={menuItem.icon}
                  />
                ))}
              </Menu>
            )
          : () => null
      }
      onLongPress={() => {
        if (!operationsAllowed) {
          return;
        }
        fileTreeScreen.setSelectedPaths([
          ...fileTreeScreen.selectedPaths,
          item.path,
        ]);
      }}
      onPress={() => {
        if (multiSelectActivated && operationsAllowed) {
          fileTreeScreen.setSelectedPaths(
            isSelected
              ? fileTreeScreen.selectedPaths.filter(p => p !== item.path)
              : [...fileTreeScreen.selectedPaths, item.path],
          );
          return;
        }
        if (item.isFile()) {
          if (operationsAllowed) {
            if (FileApi.isFileViewable(item)) {
              fileManager.openPreview(item, navigation, fileManager.sort);
            } else {
              FileApi.openFile(item).catch(exceptionHandler.handleError);
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
  item: {
    paddingLeft: 5,
  },
});

export default React.memo(DirectoryItemView);
