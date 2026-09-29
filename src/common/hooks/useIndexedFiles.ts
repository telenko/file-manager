import { useEffect, useState, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';
import debounce from 'debounce';

const { FileIndexer } = NativeModules;
const fileIndexerEmitter = new NativeEventEmitter(FileIndexer);

export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'OTHER' | 'ALL';

const getFilesDebounced = debounce((...args) => {
  return FileIndexer.getFiles(...args);
}, 300);

export interface IndexedFile {
  id: number;
  filePath: string;
  fileName: string;
  mediaType: MediaType;
  lastModified: number;
  fileSize: number;
  parentPath: string;
}

export interface UseIndexedFilesOptions {
  limit?: number; // 0 = без ліміту
  autoStart?: boolean; // за замовчуванням true
}

export const useIndexedFiles = (
  mediaTypes: MediaType[] = ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT'],
  options: UseIndexedFilesOptions = {},
) => {
  const { limit = 0, autoStart = true } = options;

  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexingStatus, setIndexingStatus] = useState<string>('IDLE');
  const [indexedCount, setIndexedCount] = useState<number>(0);

  // Використовуємо ref для масиву медіатипів, щоб уникнути зайвих перестворень через посилання на масив
  const mediaTypesRef = useRef(mediaTypes);
  useEffect(() => {
    mediaTypesRef.current = mediaTypes;
  }, [JSON.stringify(mediaTypes)]);

  // 1. Одноразове зчитування файлів із бази ObjectBox
  const refreshFiles = useCallback(async () => {
    try {
      const data: IndexedFile[] = await FileIndexer.getFiles(
        mediaTypesRef.current,
        limit,
      );
      setFiles(data);
    } catch (error) {
      console.error('[useIndexedFiles] Помилка завантаження файлів:', error);
    }
  }, [limit]);

  useEffect(() => {
    // А. Завантажуємо те, що ВЖЕ є в базі на момент відкриття
    refreshFiles();

    if (!autoStart) return;
    setIsIndexing(true);

    // Б. Підписуємося на події прогресу індексації з Kotlin
    const subscription = fileIndexerEmitter.addListener(
      'onIndexingProgress',
      (event: { status: string; count: number }) => {
        console.log('event received index', event.status);
        if (
          event.status === 'MEDIA_COMPLETE' ||
          event.status === 'DOCUMENTS_COMPLETE'
        ) {
          refreshFiles();
          setIsIndexing(false);
        }
        // setIndexingStatus(event.status);
        // setIndexedCount(event.count);

        // if (event.status === 'COMPLETED') {
        //   setIsIndexing(false);
        //   refreshFiles();
        // } else {
        //   setIsIndexing(true);
        //   // Оновлюємо список файлів під час індексації, щоб файли з'являлися плавно
        //   refreshFiles();
        // }
      },
    );

    // В. Запускаємо сканування та живий слухач (LiveObserver)
    FileIndexer.startIndexing();

    // Г. При анмаунті компонента — прибираємо підписку та зупиняємо фоновий обсервер
    return () => {
      subscription.remove();
      FileIndexer.stopIndexing();
    };
  }, [refreshFiles, autoStart]);

  return {
    files,
    isIndexing,
    indexingStatus,
    indexedCount,
    refreshFiles,
  };
};
