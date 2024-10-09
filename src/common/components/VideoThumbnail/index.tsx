import React, { useEffect, useRef, useState } from 'react';
import { DirItem, FileApi } from '../../../services/FileApi';
import { Cache } from '../../../services/Cache';
import { ImageBackground } from 'react-native';
import { Icon } from 'react-native-paper';

const VideoThumbnail = ({
  file,
  width,
  iconRadius,
}: {
  file: DirItem;
  width: number;
  iconRadius: number;
}) => {
  const fallbackThumbnail =
    'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const makeThumbnailAllowed = useRef<boolean>(false);
  const PREVIEW_SIZE = width * 2;
  useEffect(() => {
    (async () => {
      // @ts-ignore
      await new Promise(r => setTimeout(r, 600));
      if (makeThumbnailAllowed.current) {
        const cachedPreview = Cache.getVideoPreview(file.path, PREVIEW_SIZE);
        if (cachedPreview) {
          setThumbnail(cachedPreview);
        } else {
          FileApi.makeVideoPreview(file, PREVIEW_SIZE)
            .then(preview => {
              setThumbnail(preview);
              if (preview) {
                Cache.putVideoPreview(file.path, preview, PREVIEW_SIZE);
              }
            })
            .catch(() => {});
        }
      }
    })();
    return () => {
      makeThumbnailAllowed.current = false;
    };
  }, []);
  return (
    <ImageBackground
      onLayout={() => (makeThumbnailAllowed.current = true)}
      source={{ uri: thumbnail ?? fallbackThumbnail }}
      style={{
        width,
        height: width,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: iconRadius,
        overflow: 'hidden',
      }}>
      <Icon size={25} color={'#fff'} source={'play-circle'} />
    </ImageBackground>
  );
};

export default VideoThumbnail;
