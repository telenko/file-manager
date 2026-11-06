import type { DirItem } from '../../../services/FileApi';

export type GroupHeaderItem = {
  type: 'groupHeader';
  dateTimeMs: number;
};

export type LayoutItem = DirItem | GroupHeaderItem;

export const isGroupHeaderItem = (item: LayoutItem): item is GroupHeaderItem =>
  !!item && 'type' in item && item.type === 'groupHeader';
