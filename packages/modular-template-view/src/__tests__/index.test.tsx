/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render } from 'react-dom';
import ComponentName from '../index';

test('it should render', () => {
  const el = document.createElement('div');
  expect(() => render(<ComponentName />, el)).not.toThrow();
});
