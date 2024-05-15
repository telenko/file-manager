import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import { FileApi } from '../services/FileApi';
import { FileManagerNavigation } from '../common/types/navigation';
import { useTranslation } from 'react-i18next';
import ImagePreviewScreen from '../screens/ImagePreviewScreen';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  return (
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
  );
}
