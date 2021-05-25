export default function memoize<T>(fn: () => T): () => T {
  let called = false;
  let result: T;
  return () => {
    if (called) {
      return result;
    } else {
      try {
        called = true;
        result = fn();
        return result;
      } catch (e) {
        called = false;
        throw e;
      }
    }
  };
}
