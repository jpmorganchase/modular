import React, { useState } from 'react';
import { MyErrorBoundary } from './my-error-boundary';
import {
  RemoteView,
  RemoteViewErrorBoundary,
  RemoteViewProvider,
} from '@modular-scripts/remote-view';
import { H1, H2, Text, Button } from '@salt-ds/core';
import { Spinner } from '@salt-ds/lab';

import './index.css';

function MyErrorContent() {
  return (
    <div>
      <H1>A custom error fallback component!</H1>
      <Text>
        You can render and do anything you want, it's just a React component.
      </Text>
    </div>
  );
}

function RemoteViewDemos({
  toggleThemeButton,
}: {
  toggleThemeButton: JSX.Element;
}): JSX.Element {
  const [remoteViews, setRemoteViews] = useState([
    'http://localhost:8484/view1',
    'http://localhost:8484/view2',
  ]);

  const [badView] = useState('http://localhost:8484/this-view-will-404');

  function addDuplicateRemoteView() {
    setRemoteViews(['http://localhost:8484/view1', ...remoteViews]);
  }

  return (
    <RemoteViewProvider>
      <section className="ExamplesApp">
        <H1>RemoteView demos</H1>
        <Text>
          Showcase of implementing the micro-frontend pattern using{' '}
          <code>{'<RemoteView />'}</code>.
        </Text>
        <Text>
          Views loaded by <code>{'<RemoteView />'}</code> are Modular{' '}
          <a href="https://modular.js.org/esm-views/">ESM Views</a> exposed over
          HTTP. They also rely on loading dependencies from an{' '}
          <a href="https://modular.js.org/esm-views/esm-cdn/">ESM CDN</a>, which
          happens at run-time.
        </Text>
        <br />
        {toggleThemeButton}

        <H2>Happy path example</H2>
        <Button onClick={addDuplicateRemoteView}>Add Duplicate View</Button>
        <Text>
          Adding a duplicate view demonstrates that remote modules are only
          loaded once
        </Text>
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
                  />
                </RemoteViewErrorBoundary>
              </div>
            </div>
          ))}
        </div>

        <H2>View not found (default error boundary)</H2>
        <div className="ExampleContainer">
          <div className="RemoteViewContainer">
            <div className="RemoteViewContainer__label">{badView}</div>
            <div className="RemoteViewContainer__content">
              <RemoteViewErrorBoundary>
                <RemoteView
                  baseUrl={badView}
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

        <H2>View not found (custom error content)</H2>
        <pre>{'<RemoteViewErrorBoundary content={MyErrorContent}>'}</pre>
        <div className="ExampleContainer">
          <div className="RemoteViewContainer">
            <div className="RemoteViewContainer__label">{badView}</div>
            <div className="RemoteViewContainer__content">
              <RemoteViewErrorBoundary content={MyErrorContent}>
                <RemoteView
                  baseUrl={badView}
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

        <H2>View not found (custom error boundary)</H2>
        <Text>
          You can also bring your own error boundary for direct access to the
          error. This allows implementing retry, reporting and other custom
          error handling features.
        </Text>
        <pre>{'<MyErrorBoundary><RemoteView></MyErrorBoundary>'}</pre>
        <div className="ExampleContainer">
          <div className="RemoteViewContainer">
            <div className="RemoteViewContainer__label">{badView}</div>
            <div className="RemoteViewContainer__content">
              <MyErrorBoundary>
                <RemoteView
                  baseUrl={badView}
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
      </section>
    </RemoteViewProvider>
  );
}

export default React.memo(RemoteViewDemos);
