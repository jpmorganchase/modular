import React, { useState } from 'react';
import { MyErrorBoundary } from './my-error-boundary';
import { RemoteView, RemoteViewProvider } from '@modular-scripts/remote-view';
import { H2, Text } from '@salt-ds/core';
import { Spinner } from '@salt-ds/lab';

export function CustomErrorBoundaryExample() {
  const [badView] = useState('http://localhost:8484/this-view-will-404');

  return (
    <section>
      <H2>View not found (custom error boundary)</H2>
      <Text>
        You can also bring your own error boundary for direct access to the
        error. This allows implementing retry, reporting and other custom error
        handling features.
      </Text>
      <RemoteViewProvider urls={[badView]}>
        <pre>{'<MyErrorBoundary><RemoteView></MyErrorBoundary>'}</pre>
        <div className="ExampleContainer">
          <div className="RemoteViewContainer">
            <div className="RemoteViewContainer__label">{badView}</div>
            <div className="RemoteViewContainer__content">
              <MyErrorBoundary>
                <RemoteView
                  url={badView}
                  loading={
                    <Spinner
                      aria-label="loading"
                      role="status"
                      className="RemoteViewContainer__spinner"
                    />
                  }
                />
              </MyErrorBoundary>
            </div>
          </div>
        </div>
      </RemoteViewProvider>
    </section>
  );
}
