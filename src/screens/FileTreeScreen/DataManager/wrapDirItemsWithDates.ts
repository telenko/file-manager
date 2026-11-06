import type { DirItem } from '../../../services/FileApi';
import type { GroupHeaderItem, LayoutItem } from './LayoutItem';

export const wrapDirItemsWithDates = (
  dirItems: DirItem[],
  language = 'en',
): LayoutItem[] => {
  const layoutItems: LayoutItem[] = [];
  let previousDate = '';
  const requestedLocale = language.split(/[-_]/)[0].toLowerCase();
  const locale = /^(de|en|es|fr|it|nl|pl|pt|tr|uk)$/.test(requestedLocale)
    ? requestedLocale
    : 'en';

  for (const item of dirItems) {
    const timestamp = item.mtimeMs;
    if (timestamp === undefined || !Number.isFinite(timestamp)) {
      layoutItems.push(item);
      previousDate = '';
      continue;
    }

    const date = new Date(timestamp);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (dateKey !== previousDate) {
      const header: GroupHeaderItem = {
        type: 'groupHeader',
        dateTimeMs: timestamp,
        // dayjs(timestamp)
        //   .locale(locale)
        //   .format('dddd, D MMMM YYYY')
        //   .replace(/^./u, firstCharacter =>
        //     firstCharacter.toLocaleUpperCase(locale),
        //   ),
      };
      layoutItems.push(header);
      previousDate = dateKey;
    }

    layoutItems.push(item);
  }

  return layoutItems;
};
