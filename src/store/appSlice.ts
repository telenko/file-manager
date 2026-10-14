import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type AppState = {
  permissionGranted: boolean;
};

const initialState: AppState = {
  permissionGranted: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setPermissionGranted(state, action: PayloadAction<boolean>) {
      state.permissionGranted = action.payload;
    },
  },
});

export const { setPermissionGranted } = appSlice.actions;
export default appSlice.reducer;
