import * as React from 'react';
import { render } from 'react-dom';
import ComponentName__ from './index';

test('it should render', () => {
  const el = document.createElement('div');
  expect(() => render(<ComponentName__ />, el)).not.toThrow();
});
