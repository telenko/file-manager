import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { StoredFileItem } from './fileData';

type FileDataState = {
  directories: Record<string, StoredFileItem[]>;
  videoPreviews: Record<string, string>;
  indexFiles: StoredFileItem[];
};

const initialState: FileDataState = {
  directories: {},
  videoPreviews: {},
  indexFiles: [],
};

const fileDataSlice = createSlice({
  name: 'fileData',
  initialState,
  reducers: {
    setDirectoryItems(
      state,
      action: PayloadAction<{ path: string; items: StoredFileItem[] }>,
    ) {
      state.directories[action.payload.path] = action.payload.items;
    },
    clearDirectoryItems(state) {
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
    setIndexFiles(state, action: PayloadAction<StoredFileItem[]>) {
      state.indexFiles = action.payload;
    },
  },
});

export const {
  setDirectoryItems,
  clearDirectoryItems,
  setVideoPreview,
  clearVideoPreviews,
  setIndexFiles,
} = fileDataSlice.actions;
export default fileDataSlice.reducer;
