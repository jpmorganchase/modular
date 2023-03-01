import * as React from 'react';
import { render } from 'react-dom';
import View1 from '../index';

test('it should render', () => {
  const el = document.createElement('div');
  expect(() => render(<View1 />, el)).not.toThrow();
});
