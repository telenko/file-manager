import React from 'react';
import { View, Button, Text, NativeModules } from 'react-native';

const FilePickerComponent = () => {
  const handleSelectFile = () => {
    const selectedFolder = '/storage/emulated/0/Documents';
    NativeModules.PickerActivityModule.handleSend(selectedFolder);
  };

  return (
    <View>
      <Text>Here will be select of files</Text>
      <Button title="Select File" onPress={handleSelectFile} />
    </View>
  );
};

export default FilePickerComponent;
