import React, { useState } from 'react';
import { RemoteViewProvider, RemoteView } from '@modular-scripts/remote-view';

export default function RemoteViewExample() {
  const [remoteViews] = useState([
    'http://localhost:8484/esm-view-card',
    'http://localhost:8484/esm-view-list',
  ]);

  return (
    <RemoteViewProvider>
      {remoteViews.map((v, key) => (
        <section key={key}>
          <RemoteView baseUrl={v} />
        </section>
      ))}
    </RemoteViewProvider>
  );
}
