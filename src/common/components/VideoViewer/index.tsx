import React, { useEffect, useState } from 'react';
import Video from 'react-native-video'
import { DirItem, FileApi } from '../../../services/FileApi';
import { useWindowDimensions, View } from 'react-native';
import { Cache } from '../../../services/Cache';
import LoadingIndicator from '../LoadingIndicator';

const VideoViewer: React.FC<{
  file: Partial<DirItem>;
  activeFile?: DirItem;
  onActive?: (v: boolean) => void;
}> = ({ file, activeFile, onActive }) => {
  const [preview, setPreview] = useState<string | null>('');
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const { width, height } = useWindowDimensions();
  const isCurrentViewable = activeFile?.path === file.path;
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    if (!isCurrentViewable) {
      setPaused(true);
    }
  }, [isCurrentViewable]);

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
        .catch(() => { });
    }
  }, [file?.path]);

  const ratio = videoSize.width / videoSize.height;
  const hasRatio = ratio > 0;
  const style = {} as any;
  if (hasRatio) {
    style.aspectRatio = ratio;
  }
  if (width > height) {
    style.height = hasRatio ? '100%' : 0;
  } else {
    style.width = hasRatio ? '100%' : 0;
  }

  return <View style={{
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    {!hasRatio ? <LoadingIndicator size={100} /> : null}
    <Video
      controls
      source={{ uri: `file://${file.path}` }}
      style={style}
      resizeMode='contain'
      onLoad={(data) => {
        const { width, height } = data.naturalSize;
        if (width && height) {
          setVideoSize({ width, height });
        }
      }}
      poster={{
        source: { uri: preview ?? undefined },
        resizeMode: "contain",
      }}
      paused={paused}
      onPlaybackRateChange={(e) => {
        const isPlaying = e.playbackRate > 0;
        setPaused(!isPlaying);
      }}
    />
  </View>

};

export default VideoViewer;
