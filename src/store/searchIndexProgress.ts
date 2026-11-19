import { DeviceEventEmitter, NativeModules } from 'react-native';
import type { AppThunk } from '.';
import {
  SearchIndexProgress,
  setSearchIndexProgress,
} from './fileManagerSlice';

const { SearchFilesModule } = NativeModules;

export const startSearchIndexProgressSync = (): AppThunk<() => void> => dispatch => {
  let receivedEvent = false;
  const subscription = DeviceEventEmitter.addListener(
    'onSearchIndexProgress',
    (progress: SearchIndexProgress) => {
      receivedEvent = true;
      dispatch(setSearchIndexProgress(progress));
    },
  );

  SearchFilesModule.getSearchIndexProgress()
    .then((progress: SearchIndexProgress) => {
      if (!receivedEvent) {
        dispatch(setSearchIndexProgress(progress));
      }
    })
    .catch((error: unknown) => {
      console.error('Failed to get search indexing progress:', error);
    });

  return () => subscription.remove();
};