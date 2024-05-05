import React, {useEffect, useRef, useState} from 'react';
import {
  StyleSheet,
  Text,
  // useColorScheme,
  View,
  // Linking,
  Button,
  ScrollView,
  Alert,
  // Share,
  // Platform,
} from 'react-native';
import * as RNFS from 'react-native-fs';
// import {PermissionsAndroid} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import ManageExternalStorage from 'react-native-manage-external-storage';
import Share from 'react-native-share';

const isItemHidden = (itemName: string): boolean => {
  return itemName.startsWith('.');
};

// const generateContentUri = async (filePath: string) => {
//   try {
//     return `content://${filePath}`;
//   } catch (error) {
//     console.error('Error generating content URI:', error);
//     return null;
//   }
// };

// const shareFile = async (contentUri: string, mimeType: string) => {
//   try {
//     await Share.open({url: contentUri, type: mimeType});
//     console.log('File shared successfully');
//   } catch (error) {
//     console.error('Error sharing file:', error);
//   }
// };

const requestStoragePermission = async () => {
  try {
    await ManageExternalStorage();
    return true;
    // const granted = await PermissionsAndroid.requestMultiple([
    //   PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    //   PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
    //   PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    // ]);
    // if (
    //   Object.values(granted).every(
    //     grant => grant === PermissionsAndroid.RESULTS.GRANTED,
    //   )
    // ) {
    //   console.log('Storage permission granted');
    //   // Access PDF files here
    //   return true;
    // } else {
    //   console.log('Storage permission denied');
    // }
  } catch (error) {
    console.error('Error requesting storage permission:', error);
  }
};
// import RNFetchBlob from 'react-native-fetch-blob';
// @ts-ignore
// import FileOpener from 'react-native-file-opener';

// Function to get the MIME type of a file
// const getMimeType = async (filePath: string) => {
//   try {
//     // const res = await RNFetchBlob.fs.readFile(filePath, 'base64');
//     // const type = RNFetchBlob.config(res);
//     const extension = filePath.split('.').pop()?.toLowerCase();
//     const mimeTypes: Record<string, string> = {
//       // Add more file extensions and corresponding MIME types as needed
//       jpg: 'image/jpeg',
//       jpeg: 'image/jpeg',
//       png: 'image/png',
//       gif: 'image/gif',
//       pdf: 'application/pdf',
//       // Add more here...
//     };

//     return mimeTypes[extension ?? ''] || 'application/octet-stream'; // Default to binary if MIME type not found
//   } catch (error) {
//     console.error('Error getting MIME type:', error);
//     return null;
//   }
// };

const openFile = async (filePath: string) => {
  try {
    await FileViewer.open(filePath, {
      showAppsSuggestions: true,
      showOpenWithDialog: true,
    });
    // const type = await getMimeType(filePath);
    // const uri = await generateContentUri(filePath);
    // await shareFile(uri!, type!);
    // await Linking.openURL(`file://${filePath}`);
    // const type = await getMimeType(filePath);
    // await FileOpener.open(
    //   filePath, // path to the file
    //   type, // file MIME type
    // );
    console.log('File opened successfully');
  } catch (e) {
    console.error('Error opening file:', e);
  }
};

const App = () => {
  // const isDarkMode = useColorScheme() === 'dark';
  const [files, setFiles] = useState<RNFS.ReadDirItem[]>();
  const [curDir, setCurDir] = useState<string>(
    RNFS.ExternalStorageDirectoryPath,
  );
  const granted = useRef<boolean>(false);

  useEffect(() => {
    if (!curDir) {
      return;
    }
    (async () => {
      if (!granted.current) {
        granted.current = !!(await requestStoragePermission());
      }
      if (!granted.current) {
        console.error('No permission granted');
        return;
      }
      RNFS.readDir(curDir).then(r => {
        setFiles(r.filter(item => !isItemHidden(item.name)));
      });
    })();
  }, [curDir]);

  return (
    <View style={styles.sectionContainer}>
      <Text>File manager app v2</Text>
      <Button
        title="Home"
        onPress={() => {
          setCurDir(RNFS.ExternalStorageDirectoryPath);
        }}
      />
      <ScrollView style={{height: 600}}>
        {files?.map(file => (
          <Text
            key={file.path}
            style={file.isDirectory() ? styles.folder : styles.file}
            onPress={() => {
              if (file.isFile()) {
                openFile(file.path);
              } else {
                setCurDir(file.path);
              }
            }}>
            {file.name}
            {file.isFile() ? (
              <>
                <Button
                  title="Send"
                  onPress={() => {
                    Share.open({
                      title: 'Share File',
                      // message: `Sharing file: ${file.name}`,
                      url: `file://${file.path}`, // Assuming path is the file path
                    })
                      .then(console.log)
                      .catch(console.error);
                  }}
                />
                <Button
                  title="Delete"
                  onPress={() => {
                    Alert.alert(
                      'Confirm Deletion',
                      `Are you sure you want to delete ${file.name}?`,
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Delete',
                          onPress: () => {
                            RNFS.unlink(file.path);
                          },
                          style: 'destructive',
                        },
                      ],
                      {cancelable: true},
                    );
                  }}
                />
              </>
            ) : null}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  folder: {padding: 10, backgroundColor: 'darkgrey', margin: 10},
  file: {padding: 10, backgroundColor: 'white', margin: 10},
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
