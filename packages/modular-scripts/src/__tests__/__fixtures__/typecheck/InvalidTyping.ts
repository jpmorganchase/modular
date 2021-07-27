/* eslint-disable */
// @ts-nocheck

import foo from 'foo';

function convertToCelcius(temp: number): number {
  const result = (temp - 32) * (5 / 9);
}

window.__invalid__ = foo.bar;

convertToCelcius('75');
