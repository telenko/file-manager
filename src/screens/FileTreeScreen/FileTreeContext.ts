import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '../../store';
import {
  FileTreeState,
  addSelectedPath,
  setFileTree,
  setSelectedPaths,
  toggleSelectedPath,
} from '../../store/fileTreeSlice';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticFallbackOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const maybeHaptic = () => {
  if (store.getState().fileTree.selectedPaths.length > 0) {
    ReactNativeHapticFeedback.trigger('impactLight', hapticFallbackOptions);
  }
};

const dispatchSelection = (dispatch: AppDispatch, paths: string[]) => {
  dispatch(setSelectedPaths([...new Set(paths)]));
  maybeHaptic();
};

export type FileTreeContextType = {
  route: string;
  mode: FileTreeState['mode'];
  selectedPaths: string[];
  setSelectedPaths: (v: string[]) => void;
};

export const useFileTreeContext = (): FileTreeContextType => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((root: RootState) => root.fileTree);
  const updateSelectedPaths = useCallback(
    (paths: string[]) => dispatchSelection(dispatch, paths),
    [dispatch],
  );
  return {
    ...state,
    setSelectedPaths: updateSelectedPaths,
  };
};

export const useIsMultiSelectActivated = () =>
  useSelector((root: RootState) => root.fileTree.selectedPaths.length > 0);

export const useIsPathSelected = (path: string) =>
  useSelector((root: RootState) => root.fileTree.selectedPaths.includes(path));

export const useFileTreeActions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const updateFileTree = useCallback(
    (route: string, mode: FileTreeContextType['mode']) =>
      dispatch(setFileTree({ route, mode })),
    [dispatch],
  );
  const updateSelectedPaths = useCallback(
    (paths: string[]) => dispatchSelection(dispatch, paths),
    [dispatch],
  );
  const selectPath = useCallback(
    (path: string) => {
      dispatch(addSelectedPath(path));
      maybeHaptic();
    },
    [dispatch],
  );
  const togglePath = useCallback(
    (path: string) => {
      dispatch(toggleSelectedPath(path));
      maybeHaptic();
    },
    [dispatch],
  );
  return {
    setFileTree: updateFileTree,
    setSelectedPaths: updateSelectedPaths,
    selectPath,
    togglePath,
  };
};
