import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RemoteViewProvider, RemoteView } from '../components';

function FakeComponentA() {
  return <div>Faked dynamically imported module A</div>;
}

function FakeComponentB() {
  return <div>Faked dynamically imported module B</div>;
}

const mockedManifestA = {
  name: 'fake-component-a',
  version: '1.0.0',
  modular: {
    type: 'esm-view',
    externalCdnTemplate: 'http://localhost:8484/[name]@[version]',
  },
  dependencies: { react: '17.0.2' },
  bundledDependencies: [],
  module: '/static/js/main.abcd1234-a.js',
};
const mockedManifestB = {
  ...mockedManifestA,
  name: 'fake-component-b',
  module: '/static/js/main.abcd1234-b.js',
};

jest.mock('../utils/dynamicallyImport', () => {
  let n = 0;
  return {
    dynamicallyImport: () => {
      if (n === 0) {
        n += 1;
        return FakeComponentA;
      }

      return FakeComponentB;
    },
  };
});

function getMicrofrontendExample() {
  return function MicrofrontendExample() {
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
  };
}

describe('remote-view', () => {
  beforeEach(() => {
    let n = 0;
    global.fetch = jest.fn(() => {
      const manifest = n === 0 ? mockedManifestA : mockedManifestB;
      n += 1;

      return Promise.resolve({
        json: () => manifest,
      });
    }) as jest.Mock;
    // fetch.mockImplementationOnce(() => Promise.reject("API is down"));
  });

  it('should render a microfrontend example', async () => {
    const Example = getMicrofrontendExample();

    render(<Example />);

    await waitFor(() =>
      screen.findByText('Faked dynamically imported module A'),
    );
    await waitFor(() =>
      screen.findByText('Faked dynamically imported module B'),
    );

    expect(
      screen.getByText('Faked dynamically imported module A'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Faked dynamically imported module B'),
    ).toBeInTheDocument();
  });
});
