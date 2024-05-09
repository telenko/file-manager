import { useMemo } from 'react';
import { BreadCrumbItem } from '../components/BreadCrumbs';
import { useNavigation } from './useNavigation';
import { FileApi } from '../../services/FileApi';
import { removePrefixIfExists } from '../utils/string';

export const usePathBreadCrumbs = (dirPath: string): BreadCrumbItem[] => {
  const navigation = useNavigation();
  const result = useMemo<BreadCrumbItem[]>(() => {
    const rootPath = FileApi.ROOT_PATH;
    const rootPathSize = rootPath.split('/').length;
    const pathItems = dirPath.split('/').filter(item => item !== ''); // Split path and filter out empty strings
    const breadCrumbs: BreadCrumbItem[] = [];
    let accumulatedPath = '';

    breadCrumbs.push({
      name: 'Storage',
      id: rootPath,
      onPress: id => {
        navigation.navigate('Home', {
          // @ts-ignore
          route: id,
        });
      },
    });
    for (let i = 0; i < pathItems.length; i++) {
      accumulatedPath += `/${pathItems[i]}`;
      if (i >= rootPathSize - 1) {
        breadCrumbs.push({
          name: pathItems[i],
          id: accumulatedPath,
          onPress: id => {
            navigation.navigate('Home', {
              // @ts-ignore
              route: id,
            });
          },
        });
      }
    }

    return breadCrumbs;
  }, [dirPath, navigation]);
  return result;
};
