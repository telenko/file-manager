import { useEffect, useRef, useState } from 'react';
import { FileApi, StorageItem } from '../../services/FileApi';
import { useStoreLatestFolder } from './settings';

const getDefaultState = () => ({
  routes: [
    {
      name: 'FileTree',
      params: {
        route: FileApi.ROOT_PATH,
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
      !(await FileApi.getMetadata(path)).isDirectory()
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
        },
      },
    ];
    dirs.forEach(dir => {
      aggregatedPath += '/' + dir;
      routes.push({
        name: 'FileTree',
        params: {
          route: aggregatedPath,
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
    if (storeLatestFolder && storedLatestFolder) {
      makeStateFromPath(storedLatestFolder, roots)
        .then(state => {
          setState(state);
        })
        .catch(() => {
          setState(getDefaultState());
        })
        .finally(() => {
          setReady(true);
        });
    } else {
      setState(getDefaultState());
      setReady(true);
    }
    configDone.current = true;
  }, [latestFolderReady, rootsReady]);

  return {
    ready: ready && latestFolderReady && rootsReady,
    state,
  };
};
