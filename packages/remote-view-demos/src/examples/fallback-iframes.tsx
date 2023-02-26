import React from 'react';
import {
  RemoteView,
  RemoteViewErrorBoundary,
  RemoteViewProvider,
} from '@modular-scripts/remote-view';
import { H2, Text } from '@salt-ds/core';
import { Spinner } from '@salt-ds/lab';

export function FallbackIframesExample() {
  const remoteViews = [
    'http://localhost:8484/view1',
    'http://localhost:8484/view2',
  ];

  return (
    <section>
      <H2>Fallback iframe example</H2>
      <Text>
        Implement <code>loadWithIframeFallback</code> to control any views that
        should render in an iframe instead.
      </Text>
      <RemoteViewProvider>
        <div className="ExampleContainer ExampleContainer--happy-path">
          {remoteViews.map((url, key) => (
            <div className="RemoteViewContainer" key={key}>
              <div className="RemoteViewContainer__label">{url}</div>
              <div className="RemoteViewContainer__content">
                <RemoteViewErrorBoundary>
                  <RemoteView
                    baseUrl={url}
                    loading={
                      <Spinner
                        aria-label="loading"
                        role="status"
                        className="RemoteViewContainer__spinner"
                      />
                    }
                    loadWithIframeFallback={() => true}
                  />
                </RemoteViewErrorBoundary>
              </div>
            </div>
          ))}
        </div>
      </RemoteViewProvider>
    </section>
  );
}
