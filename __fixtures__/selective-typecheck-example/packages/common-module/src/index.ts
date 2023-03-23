/* eslint-disable */

// The following TS nocheck flag gets removed in test
// @ts-nocheck

export default function add(a: number, b: number): number {
  return a + b + 'c';
}

export function otherThing(input) {
  return typeof input;
}
