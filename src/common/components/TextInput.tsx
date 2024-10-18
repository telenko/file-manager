import React, { forwardRef } from 'react';
import { TextInput as TextInputPaper } from 'react-native-paper';
import { theme } from '../../theme';

//  @ts-ignore
const TextInput: typeof TextInputPaper = forwardRef((props, ref) => {
  return (
    <TextInputPaper
      //  @ts-ignore
      ref={ref}
      {...props}
      style={[props.style, theme.inputContainer]}
      underlineColor={theme.selectionColor}
      cursorColor={theme.selectionColor}
      activeOutlineColor={theme.selectionColor}
      outlineColor={theme.selectionColor}
      underlineColorAndroid={theme.selectionColor}
      selectionColor={theme.selectionColor}
      mode='outlined'
    />
  );
});

export default TextInput;
