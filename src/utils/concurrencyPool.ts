type Task<T> = () => Promise<T>;

interface ConcurrencyPool {
  add<T>(task: Task<T>): Promise<T>;
  drain(): Promise<void>;
  cancelAll(): void;
}

export function createConcurrencyPool(limit: number): ConcurrencyPool {
  let active = 0;
  let cancelled = false;
  const queue: Array<{ run: () => void }> = [];
  let drainResolve: (() => void) | null = null;
  let drainPromise: Promise<void> | null = null;

  function tryNext() {
    if (cancelled) return;
    while (active < limit && queue.length > 0) {
      active++;
      const item = queue.shift()!;
      item.run();
    }
    if (active === 0 && queue.length === 0 && drainResolve) {
      drainResolve();
      drainResolve = null;
      drainPromise = null;
    }
  }

  function add<T>(task: Task<T>): Promise<T> {
    if (cancelled) return Promise.reject(new DOMException('Pool cancelled', 'AbortError'));
    return new Promise<T>((resolve, reject) => {
      queue.push({
        run: () => {
          task().then(resolve, reject).finally(() => {
            active--;
            tryNext();
          });
        },
      });
      tryNext();
    });
  }

  function drain(): Promise<void> {
    if (active === 0 && queue.length === 0) return Promise.resolve();
    if (!drainPromise) {
      drainPromise = new Promise<void>((resolve) => {
        drainResolve = resolve;
      });
    }
    return drainPromise;
  }

  function cancelAll() {
    cancelled = true;
    queue.length = 0;
  }

  return { add, drain, cancelAll };
}
