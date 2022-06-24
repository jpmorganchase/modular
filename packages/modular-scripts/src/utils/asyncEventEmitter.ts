export type AsyncEventHandler<T extends unknown> = (
  arg: T,
) => unknown | Promise<unknown>;

export class AsyncEventEmitter<T extends unknown> {
  #handlers: Set<AsyncEventHandler<T>> = new Set();

  off(handler?: AsyncEventHandler<T>): void {
    handler ? this.#handlers.delete(handler) : this.#handlers.clear();
  }

  on(handler: AsyncEventHandler<T>): () => boolean {
    this.#handlers.add(handler);

    return () => this.#handlers.delete(handler);
  }

  async emit(arg: T): Promise<void> {
    for (const handler of this.#handlers) {
      await handler(arg);
    }
  }
}

export type AsyncEvent<T extends unknown> = AsyncEventEmitter<T>['on'] & {
  emit: AsyncEventEmitter<T>['emit'];
};

export function asyncEvent<T extends unknown>(): AsyncEvent<T> {
  const emitter = new AsyncEventEmitter<T>();

  return Object.assign(emitter.on.bind(emitter), {
    emit: emitter.emit.bind(emitter),
  });
}
