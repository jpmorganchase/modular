import React from 'react';
import { DefaultErrorFallback } from './default-error-fallback';

interface BoundaryState {
  error: string | undefined;
}

interface BoundaryProps {
  errorFallback?: React.ComponentType<{ message: string | undefined }>;
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

  componentDidCatch(error: TypeError): void {
    this.setState({ error: error.message });
  }

  render() {
    const ProvidedFallback = this.props.errorFallback;
    const errorFallbackOutput = ProvidedFallback ? (
      <ProvidedFallback message={this.state.error} />
    ) : (
      <DefaultErrorFallback message={this.state.error} />
    );

    if (this.state.error) {
      return errorFallbackOutput;
    }

    return this.props.children;
  }
}
