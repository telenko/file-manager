import type { DirItem, SearchFile } from '../../../services/FileApi';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

import { adaptEmbeddingItemIntoDirItem } from './useSearchDataManager';

const createSearchFile = (filePath: string): SearchFile => ({
  id: 1,
  filePath,
  fileName: filePath.split('/').pop() ?? '',
  mediaType: 'IMAGE',
  frameTimeMs: 0,
  pageIndex: 0,
  lastModified: 100,
});

describe('adaptEmbeddingItemIntoDirItem', () => {
  it('uses the existing file record when available', () => {
    const filePath = '/storage/photos/image.jpg';
    const fileRecord: Record<string, DirItem> = {
      [filePath]: {
        name: 'image.jpg',
        path: filePath,
        size: 1024,
        isFile: true,
        isDirectory: false,
        mtimeMs: 200,
      },
    };

    expect(adaptEmbeddingItemIntoDirItem(createSearchFile(filePath), fileRecord))
      .toBe(fileRecord[filePath]);
  });

  it('rejects search results when the file is missing from the record', () => {
    expect(
      adaptEmbeddingItemIntoDirItem(
        createSearchFile('/storage/photos/image.jpg'),
      ),
    ).toBeNull();
  });
});
