import React, { useEffect, useRef, useState } from 'react';
import Video from 'react-native-video';
import { DirItem, FileApi } from '../../../services/FileApi';
import { Image, ImageBackground, useWindowDimensions } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { Cache } from '../../../services/Cache';
import { TouchableOpacity } from 'react-native-gesture-handler';

const VideoViewer: React.FC<{
  file: Partial<DirItem>;
  activeFile?: DirItem;
}> = ({ file, activeFile }) => {
  const isCurrentViewable = activeFile?.path === file.path;
  const { width } = useWindowDimensions();
  const [paused, setPaused] = useState(true);
  const videoRef = useRef<any>();
  const [preview, setPreview] = useState<string | null>('');
  const [playStarted, setPlayStarted] = useState<boolean>(false);
  const [controls, setControls] = useState(false);
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

  console.log("PL", playStarted, isCurrentViewable)

  return (
    <>
      {isCurrentViewable ? (
        <TouchableOpacity
          onPress={() => {
            if (paused) {
              setPaused(!paused);
            } else {
              setControls(true);
            }
          }}>
          <Video
            ref={videoRef}
            onProgress={({ currentTime }) => {
              if (currentTime > 0 && !playStarted) {
                setPlayStarted(true);
              }
            }}
            source={{ uri: `file://${file.path}` }}
            style={{ width, height: '100%' }}
            paused={paused}
            poster={preview ?? fallbackThumbnail}
            resizeMode="cover"
            controls={playStarted && isCurrentViewable}
          />
        </TouchableOpacity>
      ) : (
        previewLayout
      )}
    </>
  );
};

export default VideoViewer;
