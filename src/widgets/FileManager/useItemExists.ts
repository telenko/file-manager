import { useEffect, useState } from 'react';
import { FileApi } from '../../services/FileApi';

export const useItemExists = (folder?: string, path?: string) => {
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setExists(false);
    setLoading(true);
    const timerId = setTimeout(async () => {
      try {
        if (folder && path) {
          setExists(await FileApi.exists(folder + '/' + path));
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [path, folder]);

  return {
    exists,
    loading,
  };
};
