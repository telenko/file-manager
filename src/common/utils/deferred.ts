export class Deferred<T> {
  _resolve: ((arg: T) => void) | null = null;
  _reject: ((err: any) => void) | null = null;
  _promise: Promise<T> | null = null;

  constructor() {
    this._promise = new Promise<T>((res, rej) => {
      this._resolve = res;
      this._reject = rej;
    });
  }

  get promise() {
    return this._promise!;
  }

  resolve(arg: T) {
    this._resolve?.(arg);
  }

  reject(err: any) {
    this._reject?.(err);
  }
}
