/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DefaultUnknownErrorFallback } from '../components/default-unknown-error-fallback';

describe('RemoteView DefaultUnknownErrorFallback', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('should render an error as expected', async () => {
    const thrownError = new TypeError('Fake TypeError');
    render(<DefaultUnknownErrorFallback error={thrownError} />);
    const failText = 'Something went wrong';

    await waitFor(() => screen.findByText(failText));
    expect(screen.getByText(failText)).toBeInTheDocument();
  });
});
