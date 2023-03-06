import React, { useState } from 'react';
import {
  RemoteView,
  RemoteViewError,
  RemoteViewErrorBoundary,
  RemoteViewProvider,
} from '@modular-scripts/remote-view';
import { H1, H2, Text } from '@salt-ds/core';
import { Spinner } from '@salt-ds/lab';

function MyErrorContent({ error }: { error: Error | RemoteViewError }) {
  return (
    <div>
      <H1>A custom error fallback component</H1>
      <Text>
        You can render and do anything you want, it's just a React component.
      </Text>
      <Text>
        Receives an <code>error</code> prop, which can be a{' '}
        <code>RemoteViewError</code> or <code>Error</code>.
      </Text>
      <br />
      <Text>This error:</Text>
      <Text>
        Name: <code>{error.name}</code>
      </Text>
      <Text>
        Message: <code>{error.message}</code>
      </Text>
    </div>
  );
}

export function CustomErrorContentExample() {
  const [badView] = useState('http://localhost:8484/this-view-will-404');

  return (
    <section>
      <H2>View not found (custom error content)</H2>
      <Text>
        Supply the <code>content</code> prop to conveniently customise the
        content on the provided <code>RemoteViewErrorBoundary</code>:{' '}
        <pre>{'<RemoteViewErrorBoundary content={MyErrorContent}>'}</pre>
      </Text>
      <RemoteViewProvider urls={[badView]}>
        <div className="ExampleContainer">
          <div className="RemoteViewContainer">
            <div className="RemoteViewContainer__label">{badView}</div>
            <div className="RemoteViewContainer__content">
              <RemoteViewErrorBoundary content={MyErrorContent}>
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
              </RemoteViewErrorBoundary>
            </div>
          </div>
        </div>
      </RemoteViewProvider>
    </section>
  );
}
