import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import type { DirItem } from '../../../services/FileApi';
import { usePagedLoader } from './usePagedLoader';

type TestItem = { name: string };
type LoaderProps = {
  fetchFiles: (offset: number, limit: number) => Promise<TestItem[]>;
};

let loadFiles: (() => Promise<void>) | undefined;

const LoaderHarness = ({ fetchFiles }: LoaderProps) => {
  const loader = usePagedLoader<TestItem>(
    fetchFiles,
    item =>
      ({
        name: item.name,
        path: item.name,
        size: 0,
        isFile: true,
        isDirectory: false,
      }) as DirItem,
    jest.fn(),
    10,
  );
  loadFiles = loader.load;
  return null;
};

describe('usePagedLoader', () => {
  it('starts a new load when the fetch function changes mid-request', async () => {
    let resolveInitialFetch!: (items: TestItem[]) => void;
    const initialFetch = jest.fn(
      () =>
        new Promise<TestItem[]>(resolve => {
          resolveInitialFetch = resolve;
        }),
    );
    const filteredFetch = jest.fn(async () => []);
    let renderer: ReactTestRenderer;
    let initialLoad: Promise<void>;

    await act(async () => {
      renderer = create(<LoaderHarness fetchFiles={initialFetch} />);
    });

    act(() => {
      initialLoad = loadFiles!();
    });

    await act(async () => {
      renderer.update(<LoaderHarness fetchFiles={filteredFetch} />);
    });

    await act(async () => {
      await loadFiles!();
    });

    expect(filteredFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInitialFetch([]);
      await initialLoad;
    });
    await act(async () => {
      renderer!.unmount();
    });
  });
});
