/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DefaultRemoteViewErrorFallback } from '../components/default-remote-view-error-fallback';
import { RemoteViewError } from '../utils/remoteViewError';

function mockedUseRemoteViewError(n: number): RemoteViewError | undefined {
  if (n === 0) {
    return new RemoteViewError(
      'Some example error',
      'http://cdn.example.com/fake-module-url',
    );
  }

  return undefined;
}

jest.mock('../hooks/useRemoteViewError', () => {
  let n = 0;
  return {
    useRemoteViewError: () => {
      const result = mockedUseRemoteViewError(n);
      n += 1;
      return result;
    },
  };
});

class MiniErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  { errored: boolean }
> {
  constructor(props: { children?: React.ReactNode }) {
    super(props);
    this.state = { errored: false };
  }

  componentDidCatch(): void {
    this.setState({ errored: true });
  }

  render() {
    if (this.state.errored) {
      return <div>Mini Error Boundary triggered</div>;
    }

    return this.props.children;
  }
}

describe('RemoteView DefaultErrorFallback', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('should render an error as expected', async () => {
    render(<DefaultRemoteViewErrorFallback />);
    const failText =
      'Something went wrong for module at URL "http://cdn.example.com/fake-module-url".';

    await waitFor(() => screen.findByText(failText));
    expect(screen.getByText(failText)).toBeInTheDocument();
  });

  it('should throw a new error if a RemoteViewError doesnt exist in the context', async () => {
    render(
      <MiniErrorBoundary>
        <DefaultRemoteViewErrorFallback />
      </MiniErrorBoundary>,
    );

    await waitFor(() => screen.findByText('Mini Error Boundary triggered'));
    expect(
      screen.getByText('Mini Error Boundary triggered'),
    ).toBeInTheDocument();
  });
});
