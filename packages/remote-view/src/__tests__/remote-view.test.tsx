/**
 * @jest-environment jsdom
 */

import React, { useState } from 'react';
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import {
  RemoteViewProvider,
  RemoteView,
  RemoteViewErrorBoundary,
} from '../components';
import { useRemoteViewError } from '../hooks/useRemoteViewError';
import { RemoteViewError } from '../utils/remoteViewError';

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
  styleImports: ['http://example.com/fake-path/fake-css.css'],
};
const mockedManifestB = {
  ...mockedManifestA,
  name: 'fake-component-b',
  module: '/static/js/main.abcd1234-b.js',
};

// Has no modular config (type is required)
const badManifestA = {
  ...mockedManifestA,
  name: 'bad-component-a',
  modular: {},
};

// Has an unsupported modular type
const badManifestB = {
  ...mockedManifestA,
  name: 'bad-component-b',
  modular: {
    ...mockedManifestA.modular,
    type: 'view',
  },
};

jest.mock('../utils/dynamicallyImport', () => {
  let n = 0;
  return {
    dynamicallyImport: async () => {
      let component;
      if (n === 0) {
        n += 1;
        component = FakeComponentA;
        return Promise.resolve(component);
      }

      component = FakeComponentB;
      return Promise.resolve(component);
    },
  };
});

function getMicrofrontendExample(
  useIframe = false,
  customLoader: JSX.Element | undefined,
  customFallback: React.ComponentType | undefined,
) {
  return function MicrofrontendExample() {
    const [remoteViews] = useState([
      'http://localhost:8484/esm-view-card',
      'http://localhost:8484/esm-view-list',
    ]);

    return (
      <RemoteViewProvider>
        <RemoteViewErrorBoundary content={customFallback}>
          {remoteViews.map((v, key) => (
            <section key={key}>
              <RemoteView
                loading={customLoader}
                baseUrl={v}
                loadWithIframeFallback={() => useIframe}
              />
            </section>
          ))}
        </RemoteViewErrorBoundary>
      </RemoteViewProvider>
    );
  };
}

describe('RemoteView', () => {
  describe('for supported manifests', () => {
    beforeEach(() => {
      let n = 0;
      global.fetch = jest.fn(() => {
        const manifest = n === 0 ? mockedManifestA : mockedManifestB;
        n += 1;

        return Promise.resolve({
          json: () => manifest,
        });
      }) as jest.Mock;
    });

    it('should render a microfrontend example', async () => {
      const Example = getMicrofrontendExample(false, undefined, undefined);

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

    it('should render using iframe fallbacks', async () => {
      const Example = getMicrofrontendExample(true, undefined, undefined);

      render(<Example />);

      await waitFor(() => screen.findByTitle('fake-component-a'));

      const iframeA = screen.getByTitle('fake-component-a');
      expect(iframeA).toBeInTheDocument();
      expect(iframeA.tagName.toLowerCase()).toBe('iframe');
      expect(iframeA).toHaveAttribute(
        'src',
        'http://localhost:8484/esm-view-card/index.html',
      );

      await waitFor(() => screen.findByTitle('fake-component-b'));
      const iframeB = screen.getByTitle('fake-component-b');
      expect(iframeB).toBeInTheDocument();
      expect(iframeB.tagName.toLowerCase()).toBe('iframe');
      expect(iframeB).toHaveAttribute(
        'src',
        'http://localhost:8484/esm-view-list/index.html',
      );
    });

    it('should render using a custom loader', async () => {
      const Example = getMicrofrontendExample(
        false,
        <div>Custom loader</div>,
        undefined,
      );

      render(<Example />);

      // Custom loaders available right away
      const customLoaders = screen.getAllByText('Custom loader');
      expect(customLoaders).toHaveLength(2);

      await waitForElementToBeRemoved(() =>
        screen.queryAllByText('Custom loader'),
      );
    });
  });

  describe('for unsupported manifests', () => {
    beforeEach(() => {
      let n = 0;
      global.fetch = jest.fn(() => {
        const manifest = n === 0 ? badManifestA : badManifestB;
        n += 1;

        return Promise.resolve({
          json: () => manifest,
        });
      }) as jest.Mock;

      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('should throw and display the default error fallback', async () => {
      const Example = getMicrofrontendExample(false, undefined, undefined);
      render(<Example />);

      const failText =
        'Something went wrong for module at URL "http://localhost:8484/esm-view-card".';

      await waitFor(() => screen.findByText(failText));
      expect(screen.getByText(failText)).toBeInTheDocument();

      expect.any(RemoteViewError);
    });

    it('should throw and display a custom error fallback', async () => {
      function CustomFallback() {
        const error = useRemoteViewError();
        const filteredMsgMatches = error?.message?.match(/bad-component-(a|b)/);
        const filteredMsg = filteredMsgMatches?.length
          ? filteredMsgMatches[0]
          : '';
        return <div>Custom fallback component: {filteredMsg}</div>;
      }

      const Example = getMicrofrontendExample(false, undefined, CustomFallback);
      render(<Example />);

      const failText = 'Custom fallback component: bad-component-a';

      await waitFor(() => screen.findByText(failText));
      expect(screen.getByText(failText)).toBeInTheDocument();

      expect.any(RemoteViewError);
    });
  });

  describe('when a manifest cannot be retrieved', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() => {
        return Promise.reject('Unspecified fetch rejection');
      }) as jest.Mock;

      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('gets caught by the default error boundary', async () => {
      const Example = getMicrofrontendExample(false, undefined, undefined);
      render(<Example />);

      const failText =
        'Something went wrong for module at URL "http://localhost:8484/esm-view-card".';

      await waitFor(() => screen.findByText(failText));
      expect(screen.getByText(failText)).toBeInTheDocument();

      expect.any(RemoteViewError);
    });
  });
});
