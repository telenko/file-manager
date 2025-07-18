/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import FilePickerComponent from './src/widgets/FilePicker';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent("FileManagerPicker", () => FilePickerComponent);
