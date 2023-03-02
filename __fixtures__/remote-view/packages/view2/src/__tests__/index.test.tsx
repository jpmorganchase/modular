import * as React from 'react';
import { render } from 'react-dom';
import View2 from '../index';

test('it should render', () => {
  const el = document.createElement('div');
  expect(() => render(<View2 />, el)).not.toThrow();
});
