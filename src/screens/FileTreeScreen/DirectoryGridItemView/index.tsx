import React, { useMemo, useState } from 'react';
import {
  Button,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Checkbox, IconButton, List, Menu, Text } from 'react-native-paper';

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
import { TouchableOpacity } from 'react-native-gesture-handler';

type DirItemProps = {
  item: DirectoryItemType;
};

const ICON_SIZE = 45;
const ICON_RADIUS = 4;
const MENU_ICON_SIZE = 30;

const DirectoryGridItemView: React.FC<DirItemProps> = ({ item }) => {
  const fileManager = useFileManager();
  const fileTreeScreen = useFileTreeContext();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const exceptionHandler = useExceptionHandler();
  const { width, height } = useWindowDimensions();

  const mode: FileScreenProps['route']['params']['mode'] =
    getRouteMetadatas(navigation)?.mode;

  const operationsAllowed = mode !== 'copy' && mode !== 'move';

  const multiSelectActivated = fileTreeScreen.selectedPaths.length > 0;
  const isSelected = fileTreeScreen.selectedPaths.includes(item.path);

  const RIGHT_ICON_OFFSET = -20;

  const ICON_SIZE = width / 4 - 30;

  const content = useMemo(
    () =>
      FileApi.isFileImage(item) ? (
        <Image
          source={{ uri: `file://${item.path}` }}
          style={{
            width: ICON_SIZE + 20 - 2.5,
            height: ICON_SIZE + 10,
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
        <View
          style={{
            borderRadius: ICON_RADIUS,
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%',
          }}>
          <Icon
            size={ICON_SIZE}
            color={item.isDirectory() ? theme.folderColor : theme.fileColor}
            source={item.isDirectory() ? 'folder' : 'file'}
          />
        </View>
      ),
    [item],
  );

  return (
    <View style={{ height: '100%', width: '100%', padding: 2.5 }}>
      <TouchableOpacity
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
        style={{
          height: '100%',
          width: '100%',
          borderRadius: 10,
        }}>
        <View style={{ width: ICON_SIZE + 30, height: ICON_SIZE + 10 }}>
          {content}
        </View>
        <View
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={{ fontFamily: theme.mediumText }}>{item.name}</Text>
        </View>
      </TouchableOpacity>
      {multiSelectActivated ? (
        <>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 10,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <IconButton
              size={40}
              iconColor={'rgba(50,50,250,0.8)'}
              style={{
                shadowColor: '#2e2e2e',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 10,
              }}
              onPress={() => {
                fileTreeScreen.setSelectedPaths(
                  isSelected
                    ? fileTreeScreen.selectedPaths.filter(p => p !== item.path)
                    : [...fileTreeScreen.selectedPaths, item.path],
                );
              }}
              icon={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            />
            {/* <View
              style={{
                // position: 'absolute',
                marginTop: -50,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: 30,
                height: 30,
                backgroundColor: 'white',
                zIndex: 0,
              }}
            /> */}
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    paddingLeft: 5,
  },
});

export default React.memo(DirectoryGridItemView);
