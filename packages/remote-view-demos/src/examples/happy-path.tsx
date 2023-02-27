import React, { useState } from 'react';
import {
  RemoteView,
  RemoteViewErrorBoundary,
  RemoteViewProvider,
} from '@modular-scripts/remote-view';
import { H2, Text, Button } from '@salt-ds/core';
import { Spinner } from '@salt-ds/lab';

export function HappyPathExample() {
  const [remoteViews, setRemoteViews] = useState([
    'http://localhost:8484/view1',
    'http://localhost:8484/view2',
  ]);

  function addDuplicateRemoteView() {
    setRemoteViews(['http://localhost:8484/view1', ...remoteViews]);
  }

  return (
    <section>
      <H2>Happy path example</H2>
      <Text>
        Demonstrates two working <code>RemoteView</code>s.
      </Text>
      <Button onClick={addDuplicateRemoteView}>Add Duplicate View</Button>
      <Text>
        Adding a duplicate view demonstrates that remote modules are only loaded
        once.
      </Text>
      <RemoteViewProvider urls={remoteViews}>
        <div className="ExampleContainer ExampleContainer--happy-path">
          {remoteViews.map((url, key) => (
            <div className="RemoteViewContainer" key={key}>
              <div className="RemoteViewContainer__label">{url}</div>
              <div className="RemoteViewContainer__content">
                <RemoteViewErrorBoundary>
                  <RemoteView
                    url={url}
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
          ))}
        </div>
      </RemoteViewProvider>
    </section>
  );
}
