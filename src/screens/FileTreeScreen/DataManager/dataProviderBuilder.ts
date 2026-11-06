import { DataProvider } from 'recyclerlistview';
import type { LayoutItem } from './LayoutItem';
import { isGroupHeaderItem } from './LayoutItem';

export const dataProviderBuilder = (items: LayoutItem[]) => {
  return new DataProvider((r1: LayoutItem, r2: LayoutItem) => {
    const r1IsHeader = isGroupHeaderItem(r1);
    const r2IsHeader = isGroupHeaderItem(r2);

    if (r1IsHeader || r2IsHeader) {
      return !r1IsHeader || !r2IsHeader || r1.dateTimeMs !== r2.dateTimeMs;
    }

    return r1.path !== r2.path;
  }).cloneWithRows(items);
};
