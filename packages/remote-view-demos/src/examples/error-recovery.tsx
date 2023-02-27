import React, { useState } from 'react';
import {
  RemoteView,
  RemoteViewErrorBoundary,
  RemoteViewProvider,
} from '@modular-scripts/remote-view';
import { H2, Text, Button } from '@salt-ds/core';

function SimulateCrash({
  children,
  shouldCrash,
}: {
  children: React.ReactNode;
  shouldCrash: boolean;
}) {
  if (shouldCrash) {
    throw new TypeError('Crashing on purpose for demo purposes');
  }

  return <div>{children}</div>;
}

export function ErrorRecoveryExample() {
  const remoteViews = [
    'http://localhost:8484/view1',
    'http://localhost:8484/view2',
  ];

  const [showRecoveryView, setShowRecoveryView] = useState(true);
  const [shouldCrash, setShouldCrash] = useState(false);

  // Simple way to simulate remounting a <RemoteView /> for recovery purposes
  function attemptRecovery() {
    setShowRecoveryView(false);
    setShouldCrash(false);

    setTimeout(() => {
      setShowRecoveryView(true);
    }, 250);
  }

  return (
    <section>
      <H2>Retry / Error Recovery</H2>
      <Text>
        Re-mounting a <code>RemoteViewProvider</code> will cause any errors to
        be removed and all child <code>RemoteView</code>s to be rendered from
        scratch.
      </Text>
      <Text>Hit the "Cause a crash" button, then "Recover".</Text>
      <Button onClick={() => setShouldCrash(true)}>Cause a crash</Button>
      <br />
      <Button onClick={attemptRecovery}>Attempt to recover</Button>
      <div className="ExampleContainer">
        <div className="RemoteViewContainer">
          <div className="RemoteViewContainer__label">{remoteViews[0]}</div>
          <div className="RemoteViewContainer__content">
            {showRecoveryView && (
              <RemoteViewProvider urls={remoteViews}>
                <RemoteViewErrorBoundary>
                  <SimulateCrash shouldCrash={shouldCrash}>
                    <RemoteView url={remoteViews[0]} />
                  </SimulateCrash>
                </RemoteViewErrorBoundary>
              </RemoteViewProvider>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
