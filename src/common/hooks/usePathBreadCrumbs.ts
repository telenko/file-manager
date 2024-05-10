import { useMemo } from 'react';
import { BreadCrumbItem } from '../components/BreadCrumbs';
import { useNavigation } from './useNavigation';
import { FileApi } from '../../services/FileApi';

export const usePathBreadCrumbs = (dirPath: string): BreadCrumbItem[] => {
  const navigation = useNavigation();
  const result = useMemo<BreadCrumbItem[]>(() => {
    const rootPath = FileApi.ROOT_PATH;
    const rootPathSize = rootPath.split('/').length;
    const pathItems = dirPath.split('/').filter(item => item !== ''); // Split path and filter out empty strings
    const breadCrumbs: BreadCrumbItem[] = [];
    let accumulatedPath = '';

    breadCrumbs.push({
      name: 'deviceRoot',
      needTranslate: true,
      id: rootPath,
      onPress: () => {
        // @ts-ignore
        navigation.popToTop();
      },
    });
    for (let i = 0; i < pathItems.length; i++) {
      accumulatedPath += `/${pathItems[i]}`;
      if (i >= rootPathSize - 1) {
        breadCrumbs.push({
          name: pathItems[i],
          id: accumulatedPath,
          onPress: () => {
            // @ts-ignore
            navigation.pop(pathItems.length - i - 1);
          },
        });
      }
    }

    return breadCrumbs;
  }, [dirPath, navigation]);
  return result;
};
