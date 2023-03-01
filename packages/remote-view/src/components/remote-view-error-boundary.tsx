import React from 'react';
import { RemoteViewError } from '../utils/remoteViewError';
import { DefaultRemoteViewErrorFallback } from './default-remote-view-error-fallback';
import { DefaultUnknownErrorFallback } from './default-unknown-error-fallback';

interface BoundaryState {
  error: RemoteViewError | Error | undefined;
  isRemoteViewError: boolean | undefined;
}

interface BoundaryProps {
  content?: React.ComponentType<{ error: RemoteViewError | Error }>;
  children?: React.ReactNode;
}

export class RemoteViewErrorBoundary extends React.Component<
  BoundaryProps,
  BoundaryState
> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { error: undefined, isRemoteViewError: undefined };
  }

  componentDidCatch(
    error: Error | RemoteViewError,
    errorInfo: React.ErrorInfo,
  ): void {
    const { message } = error;
    console.error(message);
    console.error(errorInfo.componentStack);

    this.setState({
      error,
      isRemoteViewError: error instanceof RemoteViewError,
    });
  }

  render() {
    if (this.state.error) {
      const ProvidedFallback = this.props.content;

      // User-provided error boundary content
      if (ProvidedFallback) {
        return <ProvidedFallback error={this.state.error} />;
      }

      // RemoteViewError specific error fallback
      if (
        this.state.isRemoteViewError &&
        this.state.error instanceof RemoteViewError
      ) {
        return <DefaultRemoteViewErrorFallback error={this.state.error} />;
      }

      // Error fallback for all other cases
      return <DefaultUnknownErrorFallback error={this.state.error} />;
    }

    return <>{this.props.children}</>;
  }
}
