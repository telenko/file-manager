import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileManagerLayout } from '../FileManagerContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  setLayout as setLayoutAction,
  setSort,
  setStoreLatestFolder as setStoreLatestFolderAction,
} from '../../../store/fileManagerSlice';

export const useSort = (): ['asc' | 'desc', () => void] => {
  const dispatch = useDispatch<AppDispatch>();
  const sort = useSelector((state: RootState) => state.fileManager.sort);
  const SORT_STORAGE_KEY = '__sort_direction__';
  const getSortDirection = async () => {
    try {
      const readValue = await AsyncStorage.getItem(SORT_STORAGE_KEY);
      return readValue === 'asc' ? 'asc' : 'desc';
    } catch {
      return 'asc';
    }
  };
  const setSortDirection = (s: 'asc' | 'desc') => {
    try {
      AsyncStorage.setItem(SORT_STORAGE_KEY, s);
    } catch {}
  };
  const sortRead = useRef(false);
  useEffect(() => {
    (async () => {
      dispatch(setSort(await getSortDirection()));
      sortRead.current = true;
    })();
  }, [dispatch]);
  useEffect(() => {
    if (!sortRead.current) {
      return;
    }
    setSortDirection(sort);
  }, [sort]);
  const toggleSort = () => dispatch(setSort(sort === 'asc' ? 'desc' : 'asc'));
  return [sort, toggleSort];
};

export const useLayout = (): [
  FileManagerLayout,
  (v: FileManagerLayout) => void,
] => {
  const dispatch = useDispatch<AppDispatch>();
  const layout = useSelector((state: RootState) => state.fileManager.layout);
  const LAYOUT_STORAGE_KEY = '__layout_type__';
  const getLayoutStore = async () => {
    try {
      const readValue = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY);
      return readValue === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  };
  const setLayoutStore = (s: FileManagerLayout) => {
    try {
      AsyncStorage.setItem(LAYOUT_STORAGE_KEY, s);
    } catch {}
  };
  const layoutRead = useRef(false);
  useEffect(() => {
    (async () => {
      dispatch(setLayoutAction(await getLayoutStore()));
      layoutRead.current = true;
    })();
  }, [dispatch]);
  useEffect(() => {
    if (!layoutRead.current) {
      return;
    }
    setLayoutStore(layout);
  }, [layout]);
  return [layout, value => dispatch(setLayoutAction(value))];
};

export const useStoreLatestFolder = () => {
  const dispatch = useDispatch<AppDispatch>();
  const storeLatestFolder = useSelector(
    (state: RootState) => state.fileManager.storeLatestFolder,
  );
  const STORE_FOLDER_KEY = '__latest-folder-store__';
  const STORE_FOLDER_PATH_KEY = '__latest-folder-path__';
  const getStoreLatestFolder = async () => {
    try {
      const readValue = await AsyncStorage.getItem(STORE_FOLDER_KEY);
      return readValue === 'true';
    } catch {
      return false;
    }
  };
  const setStoreLatestFolderInternal = (v: boolean) => {
    try {
      AsyncStorage.setItem(STORE_FOLDER_KEY, v + '');
    } catch {}
  };
  const [settingReady, setSettingReady] = useState(false);
  const [folderReady, setFolderReady] = useState(false);
  const valueRead = useRef(false);
  useEffect(() => {
    (async () => {
      dispatch(setStoreLatestFolderAction(await getStoreLatestFolder()));
      valueRead.current = true;
      setSettingReady(true);
    })();
  }, [dispatch]);
  useEffect(() => {
    if (!valueRead.current) {
      return;
    }
    setStoreLatestFolderInternal(storeLatestFolder);
  }, [storeLatestFolder]);

  const saveLatestFolder = useCallback((path: string) => {
    try {
      AsyncStorage.setItem(STORE_FOLDER_PATH_KEY, path);
    } catch {}
  }, []);

  const [storedLatestFolder, setStoredLatestFolder] = useState('');

  const readSavedLatestFolder = async () => {
    try {
      const readValue = await AsyncStorage.getItem(STORE_FOLDER_PATH_KEY);
      if (typeof readValue === 'string') {
        return readValue;
      }
      return '';
    } catch {
      return '';
    }
  };

  useEffect(() => {
    (async () => {
      setStoredLatestFolder(await readSavedLatestFolder());
      setFolderReady(true);
    })();
  }, []);

  return {
    storeLatestFolder,
    setStoreLatestFolder: (value: boolean) =>
      dispatch(setStoreLatestFolderAction(value)),
    storedLatestFolder,
    saveLatestFolder,
    latestFolderReady: folderReady && settingReady,
  };
};

export const APP_LINK_SELF_URL = `https://play.google.com/store/apps/details?id=com.telenko.filemanager`;
