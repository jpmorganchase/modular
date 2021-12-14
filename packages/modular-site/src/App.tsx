// from https://github.com/finos/perspective/tree/master/examples/react

import React, { useEffect, useRef } from 'react';

import perspective, { Table } from '@finos/perspective';
import '@finos/perspective-viewer';
import '@finos/perspective-viewer-datagrid';
import '@finos/perspective-viewer-d3fc';
import '@finos/perspective-viewer/dist/umd/material.css';
import type {
  HTMLPerspectiveViewerElement,
  PerspectiveViewerOptions,
} from '@finos/perspective-viewer';

// @ts-ignore
import superstore from 'superstore-arrow';

import './App.css';

const worker = perspective.shared_worker();

async function getTable(): Promise<Table> {
  const req = fetch(superstore as RequestInfo);
  const resp = await req;
  const buffer = await resp.arrayBuffer();
  return worker.table(buffer);
}

const config: PerspectiveViewerOptions = {
  'row-pivots': ['State'],
};

export default function App(): JSX.Element {
  const viewer = useRef<HTMLPerspectiveViewerElement>(null);

  useEffect(() => {
    void getTable().then(
      (table) => {
        if (viewer.current) {
          viewer.current.load(table);
          void viewer.current.restore(config);
        }
      },
      (err) => console.error(err),
    );
  }, []);

  // You can also the use the stringified config values as attributes
  return (
    <perspective-viewer
      ref={viewer} /*row-pivots='["State"]'*/
    ></perspective-viewer>
  );
}
