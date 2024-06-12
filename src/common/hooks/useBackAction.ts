import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

export const useBackAction = (callback: () => boolean) => {
  useFocusEffect(
    useCallback(() => {
      BackHandler.addEventListener('hardwareBackPress', callback);

      return () =>
        BackHandler.removeEventListener('hardwareBackPress', callback);
    }, [callback]),
  );
};
