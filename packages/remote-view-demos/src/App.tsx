import React from 'react';
import { H1, Text } from '@salt-ds/core';
import {
  HappyPathExample,
  FallbackIframesExample,
  DefaultErrorBoundaryExample,
  CustomErrorContentExample,
  CustomErrorBoundaryExample,
  ErrorRecoveryExample,
} from './examples';

import './index.css';

function RemoteViewDemos({
  toggleThemeButton,
}: {
  toggleThemeButton: JSX.Element;
}): JSX.Element {
  return (
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
      <HappyPathExample />
      <FallbackIframesExample />
      <DefaultErrorBoundaryExample />
      <CustomErrorContentExample />
      <CustomErrorBoundaryExample />
      <ErrorRecoveryExample />
    </section>
  );
}

export default React.memo(RemoteViewDemos);
