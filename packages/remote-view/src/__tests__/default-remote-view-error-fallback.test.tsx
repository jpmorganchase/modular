/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DefaultRemoteViewErrorFallback } from '../components/default-remote-view-error-fallback';
import { RemoteViewError } from '../utils/remoteViewError';

const mockRemoteViewError = new RemoteViewError(
  'Some example error',
  'http://cdn.example.com/fake-module-url',
);

describe('RemoteView DefaultRemoteViewErrorFallback', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('should render an error as expected', async () => {
    render(<DefaultRemoteViewErrorFallback error={mockRemoteViewError} />);
    const failText =
      'Something went wrong for module at URL "http://cdn.example.com/fake-module-url".';

    await waitFor(() => screen.findByText(failText));
    expect(screen.getByText(failText)).toBeInTheDocument();
  });
});
