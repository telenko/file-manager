import { useEffect, useRef, useState } from 'react';
import { FileApi, StorageItem } from '../../services/FileApi';
import { useStoreLatestFolder, SEARCH_INDEX_PATH } from './settings';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { setSource } from '../../store/fileTreeSlice';

const getDefaultState = () => ({
  routes: [
    {
      name: 'FileTree',
      params: {
        route: FileApi.ROOT_PATH,
        source: 'search',
      },
    },
  ],
});

const makeStateFromPath = async (
  path: string,
  roots: StorageItem[],
): Promise<any> => {
  try {
    if (
      !(await FileApi.exists(path)) ||
      !(await FileApi.getMetadata(path)).isDirectory
    ) {
      return getDefaultState();
    }
    const matchingRoot = roots.find(root => path.startsWith(root.path));
    if (!matchingRoot) {
      return getDefaultState();
    }
    const [, relativePath] = path.split(matchingRoot.path);
    if (!relativePath) {
      return {
        routes: [
          {
            name: 'FileTree',
            params: {
              route: matchingRoot.path,
              source: 'storage',
            },
          },
        ],
      };
    }
    const dirs = relativePath.split('/').filter(p => !!p);
    let aggregatedPath = matchingRoot.path;
    const routes = [
      {
        name: 'FileTree',
        params: {
          route: matchingRoot.path,
          source: 'storage',
        },
      },
    ];
    dirs.forEach(dir => {
      aggregatedPath += '/' + dir;
      routes.push({
        name: 'FileTree',
        params: {
          route: aggregatedPath,
          source: 'storage',
        },
      });
    });

    return {
      routes,
    };
  } catch (e) {
    console.error(e);
    return getDefaultState();
  }
};

export const useInitialState = (roots: StorageItem[], rootsReady: boolean) => {
  const dispatch = useDispatch<AppDispatch>();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<any>(null);
  const { storeLatestFolder, storedLatestFolder, latestFolderReady } =
    useStoreLatestFolder();

  const configDone = useRef(false);

  useEffect(() => {
    if (configDone.current) {
      return;
    }
    if (!latestFolderReady || !rootsReady) {
      return;
    }
    if (storeLatestFolder && storedLatestFolder === SEARCH_INDEX_PATH) {
      dispatch(setSource('search'));
      setState(getDefaultState());
      setReady(true);
    } else if (storeLatestFolder && storedLatestFolder) {
      makeStateFromPath(storedLatestFolder, roots)
        .then(state => {
          const route = state.routes[state.routes.length - 1];
          dispatch(setSource(route?.params?.source ?? 'search'));
          setState(state);
        })
        .catch(() => {
          dispatch(setSource('search'));
          setState(getDefaultState());
        })
        .finally(() => {
          setReady(true);
        });
    } else {
      dispatch(setSource('search'));
      setState(getDefaultState());
      setReady(true);
    }
    configDone.current = true;
  }, [dispatch, latestFolderReady, rootsReady]);

  return {
    ready: ready && latestFolderReady && rootsReady,
    state,
  };
};
