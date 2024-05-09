import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import { FileApi } from '../services/FileApi';
import { FileManagerNavigation } from '../common/types/navigation';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          // @ts-ignore
          component={HomeScreen}
          initialParams={{
            // @ts-ignore
            route: FileApi.ROOT_PATH,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
