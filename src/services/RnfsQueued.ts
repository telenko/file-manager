import * as RNFS from 'react-native-fs';
import pLimit from 'p-limit';

const FILE_API_CONCURRENCY = 30;

export const limitFileApi = pLimit(FILE_API_CONCURRENCY);

const operations: (keyof typeof RNFS)[] = [
  'exists',
  'stat',
  'mkdir',
  'readDir',
  'copyFile',
  'moveFile',
  'unlink',
];

const RnfsQueued: typeof RNFS = {
  ...RNFS,
  ...operations.reduce(
    (acc, operation) => ({
      ...acc,
      [operation]: (...args: any[]) =>
        // @ts-ignore
        limitFileApi(() => RNFS[operation](...args)),
    }),
    {},
  ),
};

export type ReadDirItem = RNFS.ReadDirItem;

export default RnfsQueued;
