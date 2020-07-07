import React from 'react';
import { render } from 'react-dom';
import Component$$ from './';

test('it should render', () => {
  const el = document.createElement('div');
  expect(() => render(<Component$$ />, el)).not.toThrow();
});
