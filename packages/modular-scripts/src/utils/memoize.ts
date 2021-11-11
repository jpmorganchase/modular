/* eslint-disable @typescript-eslint/no-explicit-any */

export default function memoize<R, T extends (...args: any[]) => R>(f: T): T {
  const memory = new Map<string, R>();

  const g = (...args: any[]) => {
    if (!memory.has(args.join())) {
      memory.set(args.join(), f(...args));
    }

    return memory.get(args.join());
  };

  return g as T;
}
