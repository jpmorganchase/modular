// eslint-disable-next-line
import React from 'react';
import App from '../App';
import { render } from 'react-dom';

jest.mock('@finos/perspective-viewer', () => null);
jest.mock('@finos/perspective-viewer-datagrid', () => null);
jest.mock('@finos/perspective-viewer-d3fc', () => null);

jest.mock(
  'superstore-arrow/superstore.arrow?url',
  () => {
    return {
      x: 123,
    };
  },
  { virtual: true },
);

const el = document.createElement('div');

test('just a stub for now', () => {
  render(<App />, el);
  expect(el.innerHTML).toMatchInlineSnapshot();
});
