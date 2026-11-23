import fileTreeReducer, {
  setMediaTypeSelected,
  setSelectedMediaTypes,
} from './fileTreeSlice';

describe('fileTree media type selection', () => {
  it('selects a media type when the selection is empty', () => {
    const emptyState = fileTreeReducer(
      undefined,
      setSelectedMediaTypes([]),
    );

    const selectedState = fileTreeReducer(
      emptyState,
      setMediaTypeSelected({ mediaType: 'IMAGE', selected: true }),
    );

    expect(selectedState.selectedMediaTypes).toEqual(['IMAGE']);
  });

  it('removes only the deselected media type', () => {
    const state = fileTreeReducer(
      undefined,
      setSelectedMediaTypes(['IMAGE', 'VIDEO']),
    );

    const nextState = fileTreeReducer(
      state,
      setMediaTypeSelected({ mediaType: 'IMAGE', selected: false }),
    );

    expect(nextState.selectedMediaTypes).toEqual(['VIDEO']);
  });
});
