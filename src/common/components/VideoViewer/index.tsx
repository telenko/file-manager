import React, { useEffect, useState } from 'react';
import Video from 'react-native-video';
import { DirItem, FileApi } from '../../../services/FileApi';
import { ImageBackground, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Cache } from '../../../services/Cache';

const VideoViewer: React.FC<{
  file: Partial<DirItem>;
  activeFile?: DirItem;
  onActive?: (v: boolean) => void;
}> = ({ file, activeFile, onActive }) => {
  const isCurrentViewable = activeFile?.path === file.path;
  const [videoActivated, setVideoActivated] = useState(false);
  const [paused, setPaused] = useState(true);
  const [preview, setPreview] = useState<string | null>('');
  const fallbackThumbnail =
    'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

  useEffect(() => {
    if (videoActivated) {
      return;
    }
    if (!paused) {
      setVideoActivated(true);
    }
  }, [paused]);

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

  const playIcon = (
    <IconButton
      onPress={() => setPaused(!paused)}
      size={90}
      iconColor="#fff"
      style={{ height: 90 }}
      icon={'play-circle'}
    />
  );

  const previewLayout = (
    <ImageBackground
      source={{ uri: preview ?? fallbackThumbnail }}
      resizeMode="contain"
      style={{
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
      {playIcon}
    </ImageBackground>
  );

  if (!preview) {
    return null;
  }
  return (
    <>
      {isCurrentViewable && videoActivated ? (
        <>
          <Video
            controls
            onPlaybackStateChanged={({ isPlaying }) => setPaused(!isPlaying)}
            paused={paused}
            source={{ uri: `file://${file.path}` }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            poster={preview ?? fallbackThumbnail}
          />
          {paused ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {playIcon}
            </View>
          ) : null}
        </>
      ) : (
        previewLayout
      )}
    </>
  );
};

export default VideoViewer;
