// Copied from https://github.com/mui-org/material-ui/blob/bdb4baa/packages/material-ui-styles/src/makeStyles/multiKeyStore.js

export const multiKeyStore = {
  set: <Key1, Key2, Value>(
    cache: Map<Key1, Map<Key2, Value>>,
    key1: Key1,
    key2: Key2,
    value: Value,
  ): void => {
    let subCache = cache.get(key1);

    if (!subCache) {
      subCache = new Map();
      cache.set(key1, subCache);
    }

    subCache.set(key2, value);
  },
  get: <Key1, Key2, Value>(
    cache: Map<Key1, Map<Key2, Value>>,
    key1: Key1,
    key2: Key2,
  ): Value | undefined => {
    const subCache = cache.get(key1);
    return subCache ? subCache.get(key2) : undefined;
  },
  delete: <Key1, Key2, Value>(
    cache: Map<Key1, Map<Key2, Value>>,
    key1: Key1,
    key2: Key2,
  ): void => {
    const subCache = cache.get(key1);
    subCache?.delete(key2);
  },
};
