import React, { useEffect, useState } from 'react';
// @ts-ignore
import Video from 'react-native-video-controls';
import { DirItem, FileApi } from '../../../services/FileApi';
import {
  ImageBackground,
  useWindowDimensions,
  View,
} from 'react-native';
import { Icon, Portal } from 'react-native-paper';
import { Cache } from '../../../services/Cache';
class CustomizedVideo extends Video {
  renderBottomControls() {
    return (
      <Portal>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {super.renderBottomControls()}
        </View>
      </Portal>
    );
  }
}

const VideoViewer: React.FC<{
  file: Partial<DirItem>;
  activeFile?: DirItem;
  onActive?: (v: boolean) => void;
}> = ({ file, activeFile, onActive }) => {
  const isCurrentViewable = activeFile?.path === file.path;
  const { width } = useWindowDimensions();
  const [paused, setPaused] = useState(true);
  const [preview, setPreview] = useState<string | null>('');
  const fallbackThumbnail =
    'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

  useEffect(() => {
    if (!file.path) {
      return;
    }
    const cachedPreview = Cache.getVideoPreview(file.path!);
    if (cachedPreview) {
      setPreview(cachedPreview);
    } else {
      // @ts-ignore
      FileApi.makeVideoPreview(file)
        .then(setPreview)
        .catch(() => {});
    }
  }, [file?.path]);

  useEffect(() => {
    if (!isCurrentViewable) {
      setPaused(true);
    }
  }, [isCurrentViewable]);

  const previewLayout = (
    <ImageBackground
      source={{ uri: preview ?? fallbackThumbnail }}
      style={{
        width,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
      <Icon size={60} color={'#fff'} source={'play-circle'} />
    </ImageBackground>
  );

  if (!preview) {
    return null;
  }
  return (
    <>
      {isCurrentViewable ? (
        // @ts-ignore
        <CustomizedVideo
          disableFullscreen
          disableBack
          onPause={() => setPaused(true)}
          onPlay={() => {
            setPaused(false);
          }}
          showHours
          paused={paused}
          source={{ uri: `file://${file.path}` }}
          style={{ width, height: '100%' }}
          poster={preview ?? fallbackThumbnail}
        />
      ) : (
        previewLayout
      )}
    </>
  );
};

export default VideoViewer;
