import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { DataProvider, LayoutProvider, RecyclerListView } from 'recyclerlistview';
import { RefreshControl } from 'react-native-gesture-handler';
import { DirItem } from '../../services/FileApi';
import {
  ScrollableRecyclerListView,
  ScrollIndicatorProvider,
} from '../../common/components/ScrollIndicator';

export type FileTreeListRef = {
  updateSelection: (selectedPaths: string[]) => void;
};

type FileTreeListProps = {
  scrollKey: string;
  dataProvider: DataProvider;
  layoutProvider: LayoutProvider;
  rowRenderer: (type: string | number, item: DirItem) => React.ReactElement;
  listStyle?: ViewStyle;
  dirLoading: boolean;
  reloadDir: () => void;
  timestamps: (number | undefined)[];
};

const FileTreeList = forwardRef<FileTreeListRef, FileTreeListProps>(
  (
    {
      scrollKey,
      dataProvider,
      layoutProvider,
      rowRenderer,
      listStyle,
      dirLoading,
      reloadDir,
      timestamps,
    },
    forwardedRef,
  ) => {
    const listRef = useRef<RecyclerListView<any, any>>(null);
    const extendedStateRef = useRef({ selectedPaths: [] as string[] });

    useImperativeHandle(
      forwardedRef,
      () => ({
        updateSelection(selectedPaths: string[]) {
          extendedStateRef.current.selectedPaths = selectedPaths;
          listRef.current?.forceRerender();
        },
      }),
      [],
    );

    const refreshControl = useMemo(
      () => <RefreshControl refreshing={dirLoading} onRefresh={reloadDir} />,
      [dirLoading, reloadDir],
    );

    return (
      <View style={styles.listContainer}>
        <ScrollIndicatorProvider>
          <ScrollableRecyclerListView
            ref={listRef}
            canChangeSize
            scrollKey={scrollKey}
            extendedState={extendedStateRef.current}
            dataProvider={dataProvider}
            layoutProvider={layoutProvider}
            rowRenderer={rowRenderer}
            style={listStyle}
            optimizeForInsertDeleteAnimations
            // @ts-ignore
            refreshControl={refreshControl}
            timestamps={timestamps}
          />
        </ScrollIndicatorProvider>
      </View>
    );
  },
);

export default React.memo(FileTreeList);

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
});
