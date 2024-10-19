import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileManagerLayout } from '../FileManagerContext';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useSort = (): ['asc' | 'desc', () => void] => {
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
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const sortRead = useRef(false);
  useEffect(() => {
    (async () => {
      setSort(await getSortDirection());
      sortRead.current = true;
    })();
  }, []);
  useEffect(() => {
    if (!sortRead.current) {
      return;
    }
    setSortDirection(sort);
  }, [sort]);
  const toggleSort = () => setSort(sort === 'asc' ? 'desc' : 'asc');
  return [sort, toggleSort];
};

export const useLayout = (): [
  FileManagerLayout,
  (v: FileManagerLayout) => void,
] => {
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
  const [layout, setLayout] = useState<FileManagerLayout>('list');
  const layoutRead = useRef(false);
  useEffect(() => {
    (async () => {
      setLayout(await getLayoutStore());
      layoutRead.current = true;
    })();
  }, []);
  useEffect(() => {
    if (!layoutRead.current) {
      return;
    }
    setLayoutStore(layout);
  }, [layout]);
  return [layout, setLayout];
};

export const useStoreLatestFolder = () => {
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
  const [storeLatestFolder, setStoreLatestFolder] = useState<boolean>(false);
  const [settingReady, setSettingReady] = useState(false);
  const [folderReady, setFolderReady] = useState(false);
  const valueRead = useRef(false);
  useEffect(() => {
    (async () => {
      setStoreLatestFolder(await getStoreLatestFolder());
      valueRead.current = true;
      setSettingReady(true);
    })();
  }, []);
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
    setStoreLatestFolder,
    storedLatestFolder,
    saveLatestFolder,
    latestFolderReady: folderReady && settingReady,
  };
};

export const APP_LINK_SELF_URL = `https://play.google.com/store/apps/details?id=com.telenko.filemanager`;
