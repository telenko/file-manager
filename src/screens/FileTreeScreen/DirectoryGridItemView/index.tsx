import React, { useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { IconButton, Text, Icon } from 'react-native-paper';
import {
  FileApi,
  type DirItem as DirectoryItemType,
} from '../../../services/FileApi';
import { theme } from '../../../theme';
// import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../common/hooks/useNavigation';
import {
  getRouteMetadatas,
  useFileManager,
} from '../../../widgets/FileManager';
import { type FileScreenProps } from '..';
import {
  useFileTreeActions,
  useIsMultiSelectActivated,
  useIsPathSelected,
} from '../FileTreeContext';
import { useExceptionHandler } from '../../../common/components/ExceptionHandler';
import VideoThumbnail from '../../../common/components/VideoThumbnail';
import { calcGridColumns, GRID_HEIGHT } from '../../../common/utils/layout';
import { specialFolderIcon } from '../specialFoldersIcons';

type DirItemProps = {
  item: DirectoryItemType;
};

const ICON_RADIUS = 4;
const GRID_GAP_SINGLE = 2.5;
const GRID_DESCRIPTION_HEIGHT = 20;

const DirectoryGridItemView: React.FC<DirItemProps> = ({ item }) => {
  const fileManager = useFileManager();
  const { selectPath, togglePath } = useFileTreeActions();
  const navigation = useNavigation();
  // // const { t } = useTranslation();
  const exceptionHandler = useExceptionHandler();
  const { width } = useWindowDimensions();
  
  const GRID_WIDTH = width / calcGridColumns(width) - 5;
  const ICON_SIZE = GRID_WIDTH - 20;
  
  const mode: FileScreenProps['route']['params']['mode'] =
    getRouteMetadatas(navigation)?.mode;

  const operationsAllowed = mode !== 'copy' && mode !== 'move';
  const multiSelectActivated = useIsMultiSelectActivated();
  const isSelected = useIsPathSelected(item.path);

  // Optimized content rendering using useMemo
  const content = useMemo(() => {
    if (FileApi.isFileImage(item)) {
      return (
        <Image
          source={{ uri: `file://${item.path}` }}
          style={{ width: '100%', height: '100%', borderRadius: ICON_RADIUS }}
        />
      );
    }
    if (FileApi.isFileVideo(item)) {
      return (
        <VideoThumbnail
          file={item}
          width={GRID_WIDTH - GRID_GAP_SINGLE * 2 - 10}
          iconRadius={ICON_RADIUS}
        />
      );
    }
    if (FileApi.isFileMusical(item)) {
      return (
        <Icon size={ICON_SIZE} source="file-music" color={theme.musicalFileColor} />
      );
    }
    if (item.path?.endsWith('.pdf')) {
      return (
        <Icon size={ICON_SIZE} source="file-pdf-box" color={theme.pdfFileColor} />
      );
    }
    if (/\.docx?$/i.test(item.path ?? '')) {
      return (
        <Icon size={ICON_SIZE} source="file-word" color={theme.docFileColor} />
      );
    }
    if (/\.xlsx?$/i.test(item.path ?? '')) {
      return (
        <Icon size={ICON_SIZE} source="file-excel" color={theme.xlxFileColor} />
      );
    }
    if (FileApi.isFileArchive(item)) {
      return (
        <Icon size={ICON_SIZE} source="archive-arrow-down" color={theme.archiveFileColor} />
      );
    }
    if (item.isDirectory) {
      return (
        <Icon
          size={ICON_SIZE - 10}
          color={theme.folderColor}
          source={specialFolderIcon(item.path) || 'folder'}
        />
      );
    }
    return <Icon size={ICON_SIZE} color={theme.fileColor} source="file" />;
  }, [item, GRID_WIDTH, ICON_SIZE]);

  // Event handlers wrapped in useCallback
  const handleLongPress = useCallback(() => {
    if (!operationsAllowed) return;
    selectPath(item.path);
  }, [operationsAllowed, selectPath, item.path]);

  const handlePress = useCallback(() => {
    if (multiSelectActivated && operationsAllowed) {
      togglePath(item.path);
      return;
    }
    if (item.isFile) {
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
  }, [multiSelectActivated, operationsAllowed, item, fileManager, navigation, exceptionHandler, togglePath]);

  const handleToggleSelection = useCallback(() => {
    togglePath(item.path);
  }, [togglePath, item.path]);

  return (
    <View style={styles.outerContainer}>
      <Pressable
        onLongPress={handleLongPress}
        onPress={handlePress}
        style={[
          styles.pressableContainer,
          {
            backgroundColor:
              multiSelectActivated && isSelected
                ? 'rgba(180,180,180,0.3)'
                : 'transparent',
          },
        ]}
      >
        <View
          style={[
            styles.contentContainer,
            {
              width: GRID_WIDTH - GRID_GAP_SINGLE * 3,
              height: GRID_HEIGHT - GRID_DESCRIPTION_HEIGHT - GRID_GAP_SINGLE * 2,
              marginTop: item.isDirectory ? 12 : 5,
            },
          ]}
        >
          {content}
        </View>
        <View style={styles.textContainer}>
          <Text
            style={{ fontFamily: theme.mediumText }}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {item.name}
          </Text>
        </View>
      </Pressable>

      {multiSelectActivated && isSelected && (
        <>
          <IconButton
            style={styles.iconButton}
            size={25}
            icon="check-circle"
            iconColor="rgb(52,116,235)"
            onPress={handleToggleSelection}
          />
          <View style={styles.badgeBackground} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    height: '100%',
    width: '100%',
    padding: 1,
  },
  pressableContainer: {
    height: '100%',
    width: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1.5,
  },
  contentContainer: {
    paddingTop: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
    height: GRID_DESCRIPTION_HEIGHT,
  },
  iconButton: {
    position: 'absolute',
    right: -5,
    top: -5,
    width: 25,
    height: 25,
    zIndex: 6,
  },
  badgeBackground: {
    position: 'absolute',
    right: 3.5,
    top: 3.5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    zIndex: 5,
  },
});

export default React.memo(DirectoryGridItemView);

export const SkeletonGridItemView = React.memo(() => {
  const { width } = useWindowDimensions();
  const GRID_WIDTH = width / calcGridColumns(width) - 5;
  return (
    <View
      style={{
        width: GRID_WIDTH - GRID_GAP_SINGLE * 3,
        height: GRID_HEIGHT - GRID_DESCRIPTION_HEIGHT - GRID_GAP_SINGLE * 2,
        backgroundColor: 'rgba(180,180,180,0.9)',
        opacity: 0.5,
        borderRadius: 4,
      }}
    />
  );
});