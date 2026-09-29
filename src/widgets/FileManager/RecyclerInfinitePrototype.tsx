import React, { useState, useEffect, useRef } from 'react';
import { View, Text, DimensionValue } from 'react-native';
import { RecyclerListView, DataProvider, LayoutProvider } from 'recyclerlistview';

interface FileItem {
  filePath: string;
  fileName: string;
  lastModified: number;
}

const ViewTypes = {
  FILE_ITEM: 0,
};

export const FileList = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // 1. DataProvider підтримує оптимізацію порівняння елементів
  const [dataProvider, setDataProvider] = useState(
    new DataProvider((r1, r2) => r1.filePath !== r2.filePath || r1.lastModified !== r2.lastModified)
  );

  // 2. LayoutProvider описує розміри елементів (обов'язково для RecyclerListView)
  const layoutProvider = useRef(
    new LayoutProvider(
      (index) => ViewTypes.FILE_ITEM,
      (type, dim) => {
        dim.width = '100%' as unknown as number; // ширина всієї строки
        dim.height = 70; // фіксована висота одного елемента списку
      }
    )
  ).current;

  // Оновлюємо DataProvider при зміні масиву файлів
  const updateList = (newList: FileItem[]) => {
    setFiles(newList);
    setDataProvider((prev) => prev.cloneWithRows(newList));
  };

  // 📥 ІВЕНТ: Отримано НОВІ (новіші) файли
  const handleNewFilesReceived = (newFiles: FileItem[]) => {
    // Вставляємо нові елементи ЗГОРИ
    const updated = [...newFiles, ...files];
    updateList(updated);
  };

  // 📥 ІВЕНТ: Завантаження наступної порції СТАРИХ файлів згодом (Infinite Scroll)
  const loadMoreOlderFiles = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      // Викликаємо ваш Native Module (наприклад, getFilesChunk(offset, limit))
      const olderFiles: FileItem[] = await NativeFileManager.getFilesChunk(files.length, 1000);

      if (olderFiles.length === 0) {
        setHasMore(false);
      } else {
        // Додаємо старі елементи ЗНИЗУ
        const updated = [...files, ...olderFiles];
        updateList(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Рендер одного елемента
  const rowRenderer = (type: any, data: FileItem) => {
    return (
      <View style={{ height: 70, justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ fontWeight: 'bold' }}>{data.fileName}</Text>
        <Text style={{ color: 'gray' }}>{data.filePath}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {files.length > 0 && (
        <RecyclerListView
          layoutProvider={layoutProvider}
          dataProvider={dataProvider}
          rowRenderer={rowRenderer}
          onEndReached={loadMoreOlderFiles}
          onEndReachedThreshold={500} // за 500px до кінця починає довантажувати
          canChangeSize={true}
        />
      )}
    </View>
  );
};