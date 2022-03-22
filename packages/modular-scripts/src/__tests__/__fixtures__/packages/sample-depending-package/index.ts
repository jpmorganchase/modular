/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// @ts-ignore
import add from 'sample-library-package';

export function double(x: number): number {
  return add(x, x);
}
