import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, StyleSheet, View } from 'react-native';
import { DirItem, FileApi } from '../../services/FileApi';
import { Cache } from '../../services/Cache';
import Gallery from '../../common/components/Gallery';
import ImageViewer from '../../common/components/ImageViewer';
import { useNavigation } from '../../common/hooks/useNavigation';
import { Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFileManager } from '../../widgets/FileManager';
import VideoViewer from '../../common/components/VideoViewer';

const { width, height } = Dimensions.get('window');
export type ImageViewerScreenProps = {
  route: { params: { route: string } };
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
  return <ImageViewer {...props} />
};

const ImagePreviewScreen: React.FC<ImageViewerScreenProps> = ({
  route: {
    params: { route },
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
    navigation.setOptions({
      headerTitle: `${file?.mtime?.toLocaleDateString()} ${file?.mtime
        ?.toLocaleTimeString()
        ?.slice(0, 5)}`,
    });
  }, [file, navigation]);
  useEffect(() => {
    FileApi.getMetadata(route).then(setFile);
    const dirItems =
      Cache.getDirItems(FileApi.getParentDirectoryPath(route)) ?? [];
    setImagesInFolderSorted(dirItems.filter(FileApi.isFileViewable));
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
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {imagesCarousel.length > 0 ? (
          <Gallery
            items={imagesCarousel}
            getItemKey={it => it.path}
            renderItem={image => (
              <ItemPreview file={image} onActive={setZooming} activeFile={file ?? undefined} />
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
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Button
          icon="share"
          onPress={() => {
            if (!file) {
              return;
            }
            FileApi.shareFile(file);
          }}>
          {t('share')}
        </Button>
        <Button
          icon="delete"
          onPress={() => {
            if (!file) {
              return;
            }
            fileManager.deleteContent(file).then(isDone => {
              if (isDone) {
                fileManager.setReloadRequired(true);
                navigation.goBack();
              }
            });
          }}>
          {t('delete')}
        </Button>
        <Button
          icon="content-copy"
          onPress={() => {
            if (!file) {
              return;
            }
            fileManager.copyContent(file, navigation);
          }}>
          {t('copy')}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  image: {
    width: width,
  },
});

export default ImagePreviewScreen;
