import { useEffect, useState, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { AppState } from 'react-native';


const { FileIndexer } = NativeModules;
const fileIndexerEmitter = new NativeEventEmitter(FileIndexer);

export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'OTHER' | 'ALL';

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
  limit?: number; // За замовчуванням 100
  autoStart?: boolean; // За замовчуванням true
}

export const useIndexedFiles = (
  mediaTypes: MediaType[] = ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT'],
  options: UseIndexedFilesOptions = {},
) => {
  const { limit = 100, autoStart = true } = options;

  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexingStatus, setIndexingStatus] = useState<string>('IDLE');
  const [indexedCount, setIndexedCount] = useState<number>(0);

  // Використовуємо ref для масиву медіатипів, щоб уникнути зайвих ререндерів
  const mediaTypesRef = useRef(mediaTypes);
  useEffect(() => {
    mediaTypesRef.current = mediaTypes;
  }, [JSON.stringify(mediaTypes)]);

  // 1. Одноразове зчитування перших N (за замовчуванням 100) файлів із бази ObjectBox
  const refreshFiles = useCallback(async () => {
    try {
      const data: IndexedFile[] = await FileIndexer.getFilesPaged(
        mediaTypesRef.current,
        0,
        limit,
      );
      console.log("Received from server files ", data.length)
      setFiles(data);
    } catch (error) {
      console.error('[useIndexedFiles] Помилка завантаження файлів:', error);
    }
  }, [limit]);

  // Хелпер для додавання/оновлення нових файлів у початок масиву
  const prependOrUpdateFiles = useCallback((updatedFiles: IndexedFile[]) => {
    if (!updatedFiles || updatedFiles.length === 0) return;

    setFiles(prevFiles => {
      const updatedPaths = new Set(updatedFiles.map(f => f.filePath));
      // Видаляємо дублікати за filePath, якщо ці файли вже були в списку
      const filteredPrev = prevFiles.filter(f => !updatedPaths.has(f.filePath));
      // Додаємо нові/змінені файли НАПОЧАТОК (вгору)
      return [...updatedFiles, ...filteredPrev];
    });
  }, []);

  useEffect(() => {
    // А. Початкове завантаження перших 100 файлів
    refreshFiles();

    if (!autoStart) return;
    setIsIndexing(true);

    // Б. Підписка на оновлення окремих/групи файлів у реальному часі
    const fileUpdateSubscription = fileIndexerEmitter.addListener(
      'onFileUpdated',
      (updatedFile: IndexedFile | IndexedFile[]) => {
        console.log("EVENT UPDATE", updatedFile);
        const incoming = Array.isArray(updatedFile) ? updatedFile : [updatedFile];
        
        // Фільтруємо лише ті медіатипи, які запитував користувач
        const filtered = incoming.filter(
          file =>
            mediaTypesRef.current.includes('ALL') ||
            mediaTypesRef.current.includes(file.mediaType),
        );

        prependOrUpdateFiles(filtered);
      },
    );

    // В. Підписка на події прогресу індексації
    const progressSubscription = fileIndexerEmitter.addListener(
      'onIndexingStatus',
      (event: { event: string; count: number }) => {
        setIndexingStatus(event.event);
        setIndexedCount(event.count);
        console.log("Event", event);

        if (
          event.event === 'SCAN_COMPLETE' ||
          event.event === 'SCAN_RESYNC'
        ) {
          refreshFiles();
          setIsIndexing(false);
        }
      },
    );

    // Г. Запускаємо сканування та LiveObserver
    FileIndexer.startIndexing();

    // Д. Очищення при анмаунті
    return () => {
      fileUpdateSubscription.remove();
      progressSubscription.remove();
      FileIndexer.stopIndexing();
    };
  }, [refreshFiles, prependOrUpdateFiles, autoStart]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
        'change',
        nextState => {
            if (nextState === 'active') {
                // App повернувся на передній план
                refreshFiles();
            }
        }
    );

    return () => subscription.remove();
}, []);

  return {
    files,
    isIndexing,
    indexingStatus,
    indexedCount,
    refreshFiles,
  };
};