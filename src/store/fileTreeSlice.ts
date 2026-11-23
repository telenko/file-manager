import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MediaType = 'IMAGE' | 'VIDEO' | 'MUSIC' | 'TEXT' | 'OTHER';

export type FileTreeState = {
  route: string;
  searchQuery?: string;
  source: 'storage' | 'search';
  mode: 'tree' | 'move' | 'copy';
  selectedPaths: string[];
  selectedMediaTypes?: MediaType[];
};

const initialState: FileTreeState = {
  route: '',
  mode: 'tree',
  source: 'search',
  selectedPaths: [],
  selectedMediaTypes: [
    'IMAGE',
    'VIDEO',
    'MUSIC',
    'TEXT',
    'OTHER',
  ],
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
    setSelectedMediaTypes(state, action: PayloadAction<MediaType[] | undefined>) {
      state.selectedMediaTypes = action.payload;
    },
    setMediaTypeSelected(
      state,
      action: PayloadAction<{ mediaType: MediaType; selected: boolean }>,
    ) {
      const selectedMediaTypes = state.selectedMediaTypes ?? [];
      const { mediaType, selected } = action.payload;

      if (selected) {
        if (!selectedMediaTypes.includes(mediaType)) {
          selectedMediaTypes.push(mediaType);
        }
        state.selectedMediaTypes = selectedMediaTypes;
        return;
      }

      state.selectedMediaTypes = selectedMediaTypes.filter(
        type => type !== mediaType,
      );
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
  setSelectedMediaTypes,
  setMediaTypeSelected,
} = fileTreeSlice.actions;
export default fileTreeSlice.reducer;
