import { Deferred } from './deferred';

export function makeQueueable<T, A extends any[]>(
  invoker: (...args: A) => Promise<T>,
  maxWorkers = 4,
): (...args: A) => Promise<T> {
  let workers: {
    scopedInvoker: () => Promise<void>;
    running: boolean;
    done: boolean;
  }[] = [];
  const update = () => {
    workers = workers.filter(w => !w.done);
    if (workers.filter(w => w.running).length >= maxWorkers) {
      return;
    }
    const workersToRunCount = maxWorkers - workers.length;
    const workersToRun = workers.filter(w => !w.running);

    workersToRun.slice(0, workersToRunCount).forEach(w => {
      w.running = true;
      w.scopedInvoker().then(() => {
        w.running = false;
        w.done = true;
        update();
      });
    });
  };

  return async (...args: A): Promise<T> => {
    const deferred = new Deferred<T>();
    workers.push({
      scopedInvoker: () =>
        invoker(...args)
          .then(res => deferred.resolve(res))
          .catch(err => deferred.reject(err)),
      running: false,
      done: false,
    });
    update();
    return deferred.promise;
  };
}
