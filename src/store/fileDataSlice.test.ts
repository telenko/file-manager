import type { DirItem } from '../services/FileApi';
import fileDataReducer, {
  removeFiles,
  setDirectoryItems,
  setIndexFiles,
  setSearchFiles,
} from './fileDataSlice';

const createFile = (path: string): DirItem => ({
  name: path.split('/').pop() ?? '',
  path,
  size: 1,
  isFile: true,
  isDirectory: false,
});

describe('fileDataSlice', () => {
  it('stores file data once and keeps collection paths as references', () => {
    const file = createFile('/storage/photos/image.jpg');
    let state = fileDataReducer(
      undefined,
      setDirectoryItems({ path: '/storage/photos', items: [file] }),
    );
    state = fileDataReducer(state, setIndexFiles([file]));
    state = fileDataReducer(state, setSearchFiles([file]));

    expect(state.fileRecord[file.path]).toBe(file);
    expect(state.directories['/storage/photos']).toEqual([file.path]);
    expect(state.indexFiles).toEqual([file.path]);
    expect(state.searchFiles).toEqual([file.path]);
  });

  it('removes deleted files and descendants from records and all collections', () => {
    const file = createFile('/storage/photos/image.jpg');
    const otherFile = createFile('/storage/other/image.jpg');
    let state = fileDataReducer(
      undefined,
      setDirectoryItems({
        path: '/storage/photos',
        items: [file],
      }),
    );
    state = fileDataReducer(state, setIndexFiles([file, otherFile]));
    state = fileDataReducer(state, setSearchFiles([file, otherFile]));

    state = fileDataReducer(state, removeFiles(['/storage/photos']));

    expect(state.fileRecord[file.path]).toBeUndefined();
    expect(state.fileRecord[otherFile.path]).toBeDefined();
    expect(state.directories['/storage/photos']).toEqual([]);
    expect(state.indexFiles).toEqual([otherFile.path]);
    expect(state.searchFiles).toEqual([otherFile.path]);
  });

  it('drops records after their final collection reference is removed', () => {
    const file = createFile('/storage/search-only.jpg');
    let state = fileDataReducer(undefined, setSearchFiles([file]));
    state = fileDataReducer(state, setSearchFiles([]));

    expect(state.fileRecord[file.path]).toBeUndefined();
    expect(state.fileReferenceCounts[file.path]).toBeUndefined();
  });
});
