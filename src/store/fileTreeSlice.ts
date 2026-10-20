import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type FileSearchContext = 'VISUAL' | 'TEXT' | 'ALL';

export type FileTreeState = {
  route: string;
  searchQuery?: string;
  serchContext?: FileSearchContext;
  source: 'storage' | 'search';
  mode: 'tree' | 'move' | 'copy';
  selectedPaths: string[];
};

const initialState: FileTreeState = {
  route: '',
  mode: 'tree',
  source: 'storage',
  selectedPaths: [],
};

const fileTreeSlice = createSlice({
  name: 'fileTree',
  initialState,
  reducers: {
    setFileTree(
      state,
      action: PayloadAction<Pick<FileTreeState, 'route' | 'mode'>>,
    ) {
      state.route = action.payload.route;
      state.mode = action.payload.mode;
      state.selectedPaths = [];
    },
    setSelectedPaths(state, action: PayloadAction<string[]>) {
      state.selectedPaths = [...new Set(action.payload)];
    },
    addSelectedPath(state, action: PayloadAction<string>) {
      if (!state.selectedPaths.includes(action.payload)) {
        state.selectedPaths.push(action.payload);
      }
    },
    toggleSelectedPath(state, action: PayloadAction<string>) {
      const index = state.selectedPaths.indexOf(action.payload);
      if (index >= 0) {
        state.selectedPaths.splice(index, 1);
      } else {
        state.selectedPaths.push(action.payload);
      }
    },
    setSource(state, action: PayloadAction<'storage' | 'search'>) {
      state.source = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string | undefined>) {
      state.searchQuery = action.payload;
    },
    setSearchContext(state, action: PayloadAction<FileSearchContext | undefined>) {
      state.serchContext = action.payload;
    },
  },
});

export const {
  setFileTree,
  setSelectedPaths,
  addSelectedPath,
  toggleSelectedPath,
  setSource,
  setSearchQuery,
  setSearchContext,
} = fileTreeSlice.actions;
export default fileTreeSlice.reducer;
