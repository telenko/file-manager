import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DirItem } from '../services/FileApi';

type FileDataState = {
  fileRecord: Record<string, DirItem>;
  fileReferenceCounts: Record<string, number>;
  directories: Record<string, string[]>;
  videoPreviews: Record<string, string>;
  indexFiles: string[];
  searchFiles: string[];
};

export const resolveFilePaths = (
  paths: string[],
  fileRecord: Record<string, DirItem>,
): DirItem[] =>
  paths
    .map(path => fileRecord[path])
    .filter((item): item is DirItem => item !== undefined);

const initialState: FileDataState = {
  fileRecord: {},
  fileReferenceCounts: {},
  directories: {},
  videoPreviews: {},
  indexFiles: [],
  searchFiles: [],
};

const addFileReferences = (state: FileDataState, items: DirItem[]) => {
  items.forEach(item => {
    state.fileRecord[item.path] = item;
    state.fileReferenceCounts[item.path] =
      (state.fileReferenceCounts[item.path] ?? 0) + 1;
  });
  return items.map(item => item.path);
};

const removeFileReferences = (state: FileDataState, paths: string[]) => {
  paths.forEach(path => {
    const remainingReferences = (state.fileReferenceCounts[path] ?? 0) - 1;
    if (remainingReferences <= 0) {
      delete state.fileReferenceCounts[path];
      delete state.fileRecord[path];
    } else {
      state.fileReferenceCounts[path] = remainingReferences;
    }
  });
};

const fileDataSlice = createSlice({
  name: 'fileData',
  initialState,
  reducers: {
    setDirectoryItems(
      state,
      action: PayloadAction<{ path: string; items: DirItem[] }>,
    ) {
      removeFileReferences(
        state,
        state.directories[action.payload.path] ?? [],
      );
      state.directories[action.payload.path] = addFileReferences(
        state,
        action.payload.items,
      );
    },
    clearDirectoryItems(state) {
      Object.values(state.directories).forEach(paths => {
        removeFileReferences(state, paths);
      });
      state.directories = {};
    },
    setVideoPreview(
      state,
      action: PayloadAction<{ key: string; preview: string }>,
    ) {
      state.videoPreviews[action.payload.key] = action.payload.preview;
    },
    clearVideoPreviews(state) {
      state.videoPreviews = {};
    },
    setIndexFiles(state, action: PayloadAction<DirItem[]>) {
      removeFileReferences(state, state.indexFiles);
      state.indexFiles = addFileReferences(state, action.payload);
    },
    appendIndexFiles(state, action: PayloadAction<DirItem[]>) {
      state.indexFiles.push(...addFileReferences(state, action.payload));
    },
    setSearchFiles(state, action: PayloadAction<DirItem[]>) {
      removeFileReferences(state, state.searchFiles);
      state.searchFiles = addFileReferences(state, action.payload);
    },
    appendSearchFiles(state, action: PayloadAction<DirItem[]>) {
      state.searchFiles.push(...addFileReferences(state, action.payload));
    },
    removeFiles(state, action: PayloadAction<string[]>) {
      const removedPaths = action.payload;
      const isRemoved = (path: string) =>
        removedPaths.some(
          removedPath =>
            path === removedPath || path.startsWith(`${removedPath}/`),
        );

      state.indexFiles = state.indexFiles.filter(
        path => !isRemoved(path),
      );
      state.searchFiles = state.searchFiles.filter(
        path => !isRemoved(path),
      );
      Object.keys(state.directories).forEach(path => {
        state.directories[path] = state.directories[path].filter(
          itemPath => !isRemoved(itemPath),
        );
      });
      Object.keys(state.fileRecord).forEach(path => {
        if (isRemoved(path)) {
          delete state.fileReferenceCounts[path];
          delete state.fileRecord[path];
        }
      });
    },
  },
});

export const {
  setDirectoryItems,
  clearDirectoryItems,
  setVideoPreview,
  clearVideoPreviews,
  setIndexFiles,
  appendIndexFiles,
  setSearchFiles,
  appendSearchFiles,
  removeFiles,
} = fileDataSlice.actions;
export default fileDataSlice.reducer;
