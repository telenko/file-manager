import React, { useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import { FileApi } from '../services/FileApi';
import { FileManagerNavigation } from '../common/types/navigation';
import { useTranslation } from 'react-i18next';
import ImagePreviewScreen from '../screens/ImagePreviewScreen';
import { FileManagerContext } from './FileManagerContext';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  const [reloadRequired, setReloadRequired] = useState(false);
  const ctxValue = useMemo(
    () => ({ reloadRequired, setReloadRequired }),
    [reloadRequired],
  );
  return (
    <FileManagerContext.Provider value={ctxValue}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            options={{
              title: t('title'),
            }}
            // @ts-ignore
            component={HomeScreen}
            initialParams={{
              // @ts-ignore
              route: FileApi.ROOT_PATH,
            }}
          />
          <Stack.Screen
            name="ImageViewer"
            options={{
              title: t('imageViewer'),
            }}
            // @ts-ignore
            component={ImagePreviewScreen}
            initialParams={{
              // @ts-ignore
              route: null,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </FileManagerContext.Provider>
  );
}
