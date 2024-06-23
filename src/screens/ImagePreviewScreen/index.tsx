import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
  const [zooming, setZooming] = useState(false);
  const [file, setFile] = useState<DirItem | null>(null);
  const [imagesInFolderSorted, setImagesInFolderSorted] = useState<DirItem[]>(
    [],
  );
  const { t } = useTranslation();
  const fileManager = useFileManager();

  useEffect(() => {
    const timeLocalized = `${file?.mtime?.toLocaleDateString()} ${file?.mtime
      ?.toLocaleTimeString([], { hour12: false }) // Use 24-hour format to avoid AM/PM
      ?.replace(/^(\d{1}):/, '0$1:')}`;
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
      <View style={{ flex: 1 }}>
        {imagesCarousel.length > 0 ? (
          <Gallery
            items={imagesCarousel}
            getItemKey={it => it.path}
            renderItem={image => (
              <ItemPreview
                file={image}
                onActive={setZooming}
                activeFile={file ?? undefined}
              />
            )}
            selectedItemKey={route}
            onItemOpen={setFile}
            disableScrolling={zooming}
          />
        ) : (
          <ItemPreview
            onActive={setZooming}
            file={{
              path: route,
            }}
          />
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        {actions.map(action => {
          return (
            <ActionButton
              key={action.text}
              icon={action.icon}
              onPress={action.onPress}
              text={action.text}
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ImagePreviewScreen;
