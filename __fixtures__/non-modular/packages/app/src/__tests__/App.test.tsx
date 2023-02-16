import * as React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/The result is 14/i);
  expect(linkElement).toBeInTheDocument();
});
