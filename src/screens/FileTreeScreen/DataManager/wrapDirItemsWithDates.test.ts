import type { DirItem } from '../../../services/FileApi';
import { wrapDirItemsWithDates } from './wrapDirItemsWithDates';

const makeItem = (name: string, mtimeMs?: number): DirItem =>
  ({
    name,
    path: `/${name}`,
    size: 1,
    isFile: true,
    isDirectory: false,
    ctimeMs: undefined,
    mtimeMs,
  }) as DirItem;

describe('wrapDirItemsWithDates', () => {
  it('inserts one header before each consecutive date group', () => {
    const firstDate = new Date(2025, 0, 1, 10).getTime();
    const sameDate = new Date(2025, 0, 1, 15).getTime();
    const nextDate = new Date(2025, 0, 2, 10).getTime();
    const firstItem = makeItem('first.jpg', firstDate);
    const secondItem = makeItem('second.jpg', sameDate);
    const thirdItem = makeItem('third.jpg', nextDate);

    expect(
      wrapDirItemsWithDates([firstItem, secondItem, thirdItem], 'en'),
    ).toEqual([
      {
        type: 'groupHeader',
        dateTimeMs: firstDate,
        label: 'Wednesday, 1 January 2025',
      },
      firstItem,
      secondItem,
      {
        type: 'groupHeader',
        dateTimeMs: nextDate,
        label: 'Thursday, 2 January 2025',
      },
      thirdItem,
    ]);
  });

  it('formats date headers using the requested language', () => {
    const date = new Date(2025, 4, 23, 10).getTime();

    expect(wrapDirItemsWithDates([makeItem('file.jpg', date)], 'uk')[0]).toEqual(
      {
        type: 'groupHeader',
        dateTimeMs: date,
        label: 'П’ятниця, 23 травня 2025',
      },
    );
  });

  it('keeps items without timestamps and emits no date header for them', () => {
    const item = makeItem('unknown.jpg');

    expect(wrapDirItemsWithDates([item])).toEqual([item]);
  });
});
