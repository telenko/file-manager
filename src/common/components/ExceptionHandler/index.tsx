import React, { useContext } from 'react';
import { View } from 'react-native';
import ErrorModal from './ErrorModal';

export enum ErrorType {
  CRASH = 'CRASH',
  FILE_API = 'FILE_API',
  UNKNOWN = 'UNKNOWN',
}

export class FileManagerError extends Error {
  public readonly code: ErrorType;
  public readonly origError: Error | any | string;
  public handled: boolean = false;
  constructor(
    message: string,
    code: ErrorType,
    origError: Error | any | string,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.origError = origError;
    if (origError instanceof Error) {
      this.stack += `\nCaused by: ${origError.stack}`;
    } else if (typeof origError === 'string') {
      this.stack += `\nCaused by: ${origError}`;
    } else if (origError !== null && origError !== undefined) {
      this.stack += `\nCaused by: ${JSON.stringify(origError)}`;
    }
  }
}

type ExceptionHandlerType = {
  handleError: (error: FileManagerError | Error) => void;
};

const ExceptionHandlerContext = React.createContext<ExceptionHandlerType>({
  handleError: () => {},
});

const GLOBAL_KEY = '___global_exception_handler___';

class ExceptionHandler extends React.Component<
  any,
  {
    hasError: boolean;
    error: FileManagerError | Error | null;
    appCount: number;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, appCount: 1 };
    // @ts-ignore
    globalThis[GLOBAL_KEY] = {
      handleError: this.handleError.bind(this),
    };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  handleError(error: FileManagerError | Error) {
    this.setState({
      hasError: true,
      error,
    });
  }
  resetApp() {
    this.setState({
      hasError: false,
      error: null,
      appCount: this.state.appCount + 1,
    });
  }
  dismissError() {
    this.setState({
      hasError: false,
      error: null,
    });
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error(error, errorInfo);
  }
  isCriticalError() {
    if (!this.state.error) {
      return false; // no error
    }
    if (this.state.error instanceof FileManagerError) {
      return [ErrorType.CRASH, ErrorType.UNKNOWN].includes(
        this.state.error.code,
      );
    }
    return true;
  }
  render() {
    return (
      <ExceptionHandlerContext.Provider
        value={{
          handleError: this.handleError.bind(this),
        }}>
        <View style={{ flex: 1 }} key={this.state.appCount}>
          {this.props.children}
        </View>
        {this.state.hasError ? (
          <ErrorModal
            error={this.state.error}
            onDismiss={() => {
              if (this.isCriticalError()) {
                this.resetApp();
                return;
              }
              this.dismissError();
            }}
          />
        ) : null}
      </ExceptionHandlerContext.Provider>
    );
  }
}

export const useExceptionHandler = (): ExceptionHandlerType => {
  return useContext(ExceptionHandlerContext);
};

export const getGlobalExceptionHandler = (): ExceptionHandlerType | null => {
  // @ts-ignore
  return globalThis[GLOBAL_KEY] ?? null;
};

export default ExceptionHandler;
