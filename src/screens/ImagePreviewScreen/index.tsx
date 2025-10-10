import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { DirItem, FileApi } from '../../services/FileApi';
import { Cache } from '../../services/Cache';
import Gallery from '../../common/components/Gallery';
import ImageViewer from '../../common/components/ImageViewer';
import { useNavigation } from '../../common/hooks/useNavigation';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFileManager } from '../../widgets/FileManager';
import VideoViewer from '../../common/components/VideoViewer';
import ActionButton from '../../common/components/ActionButton';
import AppHeader from '../../common/components/AppHeader';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../../theme';

export type ImageViewerScreenProps = {
  route: { params: { route: string; sort: 'asc' | 'desc' } };
};

const ItemPreview: React.FC<{
  file: Partial<DirItem>;
  onActive?: (zooming: boolean) => void;
  activeFile?: DirItem;
}> = props => {
  // @ts-ignore
  if (FileApi.isFileVideo(props.file)) {
    return <VideoViewer {...props} />;
  }
  return <ImageViewer {...props} />;
};

const ImagePreviewScreen: React.FC<ImageViewerScreenProps> = ({
  route: {
    params: { route, sort },
  },
}) => {
  if (!route) {
    return null;
  }
  const navigation = useNavigation();
  const [file, setFile] = useState<DirItem | null>(null);
  const [imagesInFolderSorted, setImagesInFolderSorted] = useState<DirItem[]>(
    [],
  );
  const { width, height } = useWindowDimensions();
  const [isLandscape, setIsLandscape] = useState(width > height);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsLandscape(window.width > window.height);
    });
    return () => sub?.remove();
  }, []);
  const [showActions, setShowActions] = useState(true);
  useEffect(() => {
    if (isLandscape) {
      setShowActions(false);
    } else {
      setShowActions(true);
    }
  }, [isLandscape]);

  useEffect(() => {
    navigation.setOptions({
      header: (props: any) => (
        <Animated.View style={[{ flex: 1 }, animatedHeaderStyle]}>
          <AppHeader
            {...props}
            style={[isLandscape ? styles.headerAbsolute : null]}
            headerBackColor={isLandscape ? theme.negativeColor : undefined}
          />
        </Animated.View>
      ),
      headerTitleStyle: isLandscape
        ? {
            color: theme.negativeColor,
          }
        : {},
    });
  }, [showActions, isLandscape]);
  useEffect(() => {
    return () => {
      navigation.setOptions({
        header: (props: any) => <AppHeader {...props} />,
        headerTitleStyle: null,
      });
    };
  }, []);
  const { t } = useTranslation();
  const fileManager = useFileManager();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(showActions ? 1 : 0, { duration: 200 });
  }, [showActions]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        translateY: withTiming(showActions ? 0 : isLandscape ? 80 : 50, {
          duration: 250,
        }),
      },
    ],
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const translateY = withTiming(showActions ? 0 : -80, { duration: 250 });

    return {
      opacity: withTiming(showActions ? 1 : 0, { duration: 250 }),
      transform: [{ translateY }],
    };
  });

  useEffect(() => {
    const timeLocalized = file?.mtime
      ? `${file?.mtime?.toLocaleDateString()} ${file?.mtime
          ?.toLocaleTimeString([], { hour12: false }) // Use 24-hour format to avoid AM/PM
          ?.replace(/^(\d{1}):/, '0$1:')}`
      : '';
    navigation.setOptions({
      headerTitle: timeLocalized,
    });
  }, [file, navigation]);
  useEffect(() => {
    (async () => {
      FileApi.getMetadata(route).then(setFile);

      let dirItems = Cache.getDirItems(FileApi.getParentDirectoryPath(route));
      if (!dirItems) {
        // if no files in cache - then fetch them manually
        dirItems = FileApi.sortDirItems(
          await FileApi.readDir(FileApi.getParentDirectoryPath(route)),
          sort,
        );
      }
      setImagesInFolderSorted(dirItems.filter(FileApi.isFileViewable));
    })();
  }, []);

  const imagesCarousel = useMemo<DirItem[]>(() => {
    if (!imagesInFolderSorted || imagesInFolderSorted.length === 0) {
      if (!file) {
        return [];
      }
      return [file];
    }
    return imagesInFolderSorted;
  }, [file, imagesInFolderSorted, route]);

  const actions = [
    {
      text: t('share'),
      icon: 'share-outline',
      onPress: () => {
        if (!file) {
          return;
        }
        FileApi.shareFile([file]);
      },
    },
    {
      text: t('delete'),
      icon: 'delete-outline',
      onPress: () => {
        if (!file) {
          return;
        }
        fileManager.deleteContent([file]).then(isDone => {
          if (isDone) {
            fileManager.setReloadRequired(true);
            navigation.goBack();
          }
        });
      },
    },
    {
      text: t('copy'),
      icon: 'content-copy',
      onPress: () => {
        if (!file) {
          return;
        }
        fileManager.copyContent([file], navigation);
      },
    },
    {
      text: t('move'),
      icon: 'file-move-outline',
      onPress: () => {
        if (!file) {
          return;
        }
        fileManager.moveContent([file], navigation);
      },
    },
    {
      text: t('details'),
      icon: 'information-outline',
      onPress: () => {
        if (!file) {
          return;
        }
        fileManager.showFileDetails(file);
      },
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]}>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => {
          if (isLandscape) {
            setShowActions(p => !p);
          }
        }}>
        {imagesCarousel.length > 0 ? (
          <Gallery
            items={imagesCarousel}
            getItemKey={it => it.path}
            renderItem={image => (
              <ItemPreview file={image} activeFile={file ?? undefined} />
            )}
            selectedItemKey={route}
            onItemOpen={setFile}
          />
        ) : (
          <ItemPreview
            file={{
              path: route,
            }}
          />
        )}
      </Pressable>
      {showActions ? (
        <Animated.View
          style={[
            styles.overlayStatic,
            isLandscape ? styles.overlayAbsolute : {},
            animatedStyle,
          ]}>
          {actions.map(action => {
            return (
              <ActionButton
                key={action.text}
                icon={action.icon}
                onPress={action.onPress}
                text={action.text}
                iconColor={isLandscape ? theme.negativeColor : undefined}
                textStyle={
                  isLandscape ? { color: theme.negativeColor } : undefined
                }
              />
            );
          })}
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayStatic: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlayAbsolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)', // напівпрозорий фон для контрасту
  },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)', // напівпрозорий фон для контрасту
  },
});

export default ImagePreviewScreen;
