import React from 'react';
import { render } from 'react-dom';
import ComponentName$$ from './';

test('it should render', () => {
  const el = document.createElement('div');
  expect(() => render(<ComponentName$$ />, el)).not.toThrow();
});
