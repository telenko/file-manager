import React, { useEffect, useRef, useState } from 'react';
import { DirItem, FileApi } from '../../../services/FileApi';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import { setVideoPreview } from '../../../store/fileDataSlice';
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
  const dispatch = useDispatch<AppDispatch>();
  const makeThumbnailAllowed = useRef<boolean>(false);
  const PREVIEW_SIZE = width * 2;
  const cacheKey = `${file.path}_${PREVIEW_SIZE}`;
  const storedPreview = useSelector(
    (state: RootState) => state.fileData.videoPreviews[cacheKey],
  );

  useEffect(() => {
    if (storedPreview) {
      setThumbnail(storedPreview);
    }
  }, [storedPreview]);

  useEffect(() => {
    (async () => {
      // @ts-ignore
      await new Promise(r => setTimeout(r, 600));
      if (makeThumbnailAllowed.current && !storedPreview) {
        FileApi.makeVideoPreview(file, PREVIEW_SIZE)
          .then(preview => {
            setThumbnail(preview);
            if (preview) {
              dispatch(setVideoPreview({ key: cacheKey, preview }));
            }
          })
          .catch(() => {});
      }
    })();
    return () => {
      makeThumbnailAllowed.current = false;
    };
  }, [cacheKey, dispatch, file, PREVIEW_SIZE, storedPreview]);

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
