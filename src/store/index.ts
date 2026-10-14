import { combineReducers, configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import fileManagerReducer from './fileManagerSlice';
import fileTreeReducer from './fileTreeSlice';
import fileDataReducer from './fileDataSlice';

export const rootReducer = combineReducers({
  app: appReducer,
  fileManager: fileManagerReducer,
  fileTree: fileTreeReducer,
  fileData: fileDataReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // fileData holds full directory listings and base64 video previews.
      // RTK's dev checks walk the whole state on every dispatch; selection
      // would otherwise lag in proportion to folder size.
      immutableCheck: { ignoredPaths: ['fileData'] },
      serializableCheck: { ignoredPaths: ['fileData'] },
    }),
});
