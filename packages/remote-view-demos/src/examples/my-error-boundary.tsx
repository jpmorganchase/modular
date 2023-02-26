import React from 'react';
import { RemoteViewError } from '@modular-scripts/remote-view';

interface BoundaryState {
  error: RemoteViewError | undefined;
}

interface BoundaryProps {
  content?: React.ComponentType;
  children?: React.ReactNode;
}

export class MyErrorBoundary extends React.Component<
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
      return <div>The error was: {this.state.error.message}</div>;
    }

    return this.props.children;
  }
}
