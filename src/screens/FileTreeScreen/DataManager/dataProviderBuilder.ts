import { DataProvider } from 'recyclerlistview';
import { DirItem } from '../../../services/FileApi';

export const dataProviderBuilder = (items: DirItem[]) =>
  new DataProvider(
    (r1: DirItem, r2: DirItem) => r1.path !== r2.path,
  ).cloneWithRows(items);
