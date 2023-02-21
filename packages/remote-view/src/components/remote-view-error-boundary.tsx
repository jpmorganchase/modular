import React from 'react';
import { RemoteViewError } from '../utils/remoteViewError';
import { DefaultErrorFallback } from './default-error-fallback';

interface BoundaryState {
  error: RemoteViewError | undefined;
}

interface BoundaryProps {
  content?: React.ComponentType;
  children?: React.ReactNode;
}

export class RemoteViewErrorBoundary extends React.Component<
  BoundaryProps,
  BoundaryState
> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { error: undefined };
  }

  componentDidCatch(error: RemoteViewError, errorInfo: React.ErrorInfo): void {
    const { message } = error;
    console.error(message);
    console.error(errorInfo.componentStack);
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      const ProvidedFallback = this.props.content;
      const errorFallbackOutput = ProvidedFallback ? (
        <ProvidedFallback />
      ) : (
        <DefaultErrorFallback />
      );

      return errorFallbackOutput;
    }

    return this.props.children;
  }
}
