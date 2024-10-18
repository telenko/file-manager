import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { IconButton, Text } from 'react-native-paper';
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
import { calcGridColumns, GRID_HEIGHT } from '../../../common/utils/layout';

type DirItemProps = {
  item: DirectoryItemType;
};

const ICON_RADIUS = 4;

const DirectoryGridItemView: React.FC<DirItemProps> = ({ item }) => {
  const fileManager = useFileManager();
  const [isScrolling, setScrolling] = useState(false);
  const startY = useRef<number | null>(null);
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

  const GRID_WIDTH = width / calcGridColumns(width) - 5;
  const GRID_GAP_SINGLE = 2.5;
  const GRID_DESCRIPTION_HEIGHT = 20;
  const ICON_SIZE = GRID_WIDTH - 20;

  const content = useMemo(
    () =>
      FileApi.isFileImage(item) ? (
        <Image
          source={{ uri: `file://${item.path}` }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: ICON_RADIUS,
          }}
        />
      ) : FileApi.isFileVideo(item) ? (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
          <VideoThumbnail
            file={item}
            width={GRID_WIDTH - GRID_GAP_SINGLE * 2 - 10}
            iconRadius={ICON_RADIUS}
          />
        </View>
      ) : FileApi.isFileMusical(item) ? (
        <View
          style={{
            borderRadius: ICON_RADIUS,
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Icon
            size={ICON_SIZE}
            source={'file-music'}
            color={theme.musicalFileColor}
          />
        </View>
      ) : item.path?.endsWith('.pdf') ? (
        <View
          style={{
            borderRadius: ICON_RADIUS,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 5,
          }}>
          <Icon
            size={ICON_SIZE}
            source={'file-pdf-box'}
            color={theme.pdfFileColor}
          />
        </View>
      ) : /\.docx?$/i.test(item.path ?? '') ? (
        <View
          style={{
            borderRadius: ICON_RADIUS,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Icon
            size={ICON_SIZE}
            source={'file-word'}
            color={theme.docFileColor}
          />
        </View>
      ) : /\.xlsx?$/i.test(item.path ?? '') ? (
        <View
          style={{
            borderRadius: ICON_RADIUS,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Icon
            size={ICON_SIZE}
            source={'file-excel'}
            color={theme.xlxFileColor}
          />
        </View>
      ) : FileApi.isFileArchive(item) ? (
        <View
          style={{
            borderRadius: ICON_RADIUS,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
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
            marginTop: item.isDirectory() ? 12 : 0,
          }}>
          <Icon
            size={item.isDirectory() ? ICON_SIZE - 10 : ICON_SIZE}
            color={item.isDirectory() ? theme.folderColor : theme.fileColor}
            source={item.isDirectory() ? 'folder' : 'file'}
          />
        </View>
      ),
    [item],
  );

  return (
    <View style={{ height: '100%', width: '100%', padding: 1 }}>
      {/* Pressable container needed to help with scroll/touch events conflicts on screens without content overflow */}
      <Pressable
        onTouchStart={event => {
          startY.current = event.nativeEvent.pageY;
          setScrolling(false);
        }}
        onTouchEnd={event => {
          const touchEndY = event.nativeEvent.pageY;
          if (Math.abs(touchEndY - (startY.current || 0)) > 10) {
            setScrolling(true);
          }
        }}>
        <TouchableOpacity
          onLongPress={() => {
            if (isScrolling) {
              return;
            }
            if (!operationsAllowed) {
              return;
            }
            fileTreeScreen.setSelectedPaths([
              ...fileTreeScreen.selectedPaths,
              item.path,
            ]);
          }}
          onPress={() => {
            if (isScrolling) {
              return;
            }
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
            backgroundColor:
              multiSelectActivated && isSelected
                ? 'rgba(180,180,180,0.3)'
                : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 1.5,
          }}>
          <View
            style={{
              paddingTop: 5,
              width: GRID_WIDTH - GRID_GAP_SINGLE * 3,
              height:
                GRID_HEIGHT - GRID_DESCRIPTION_HEIGHT - GRID_GAP_SINGLE * 2,
            }}>
            {content}
          </View>
          <View
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              overflow: 'hidden',
              height: GRID_DESCRIPTION_HEIGHT,
            }}>
            <Text
              style={{ fontFamily: theme.mediumText }}
              numberOfLines={1}
              ellipsizeMode="middle">
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
      </Pressable>
      {multiSelectActivated && isSelected ? (
        <>
          <IconButton
            style={{
              position: 'absolute',
              right: -5,
              top: -5,
              width: 25,
              height: 25,
              zIndex: 6,
            }}
            size={25}
            icon={'check-circle'}
            iconColor="rgb(52,116,235)"
            onPress={() => {
              fileTreeScreen.setSelectedPaths(
                isSelected
                  ? fileTreeScreen.selectedPaths.filter(p => p !== item.path)
                  : [...fileTreeScreen.selectedPaths, item.path],
              );
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: 3.5,
              top: 3.5,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: 'white',
              zIndex: 5,
            }}
          />
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  item: {},
});

export default React.memo(DirectoryGridItemView);
