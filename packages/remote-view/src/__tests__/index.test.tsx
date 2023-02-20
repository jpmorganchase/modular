import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  RemoteViewProvider,
  RemoteView,
  RemoteViewErrorBoundary,
} from '../components';

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
  customFallback:
    | React.ComponentType<{ message: string | undefined }>
    | undefined,
) {
  return function MicrofrontendExample() {
    const [remoteViews] = useState([
      'http://localhost:8484/esm-view-card',
      'http://localhost:8484/esm-view-list',
    ]);

    return (
      <RemoteViewProvider>
        {remoteViews.map((v, key) => (
          <section key={key}>
            <RemoteViewErrorBoundary errorFallback={customFallback}>
              <RemoteView
                loading={customLoader}
                baseUrl={v}
                loadWithIframeFallback={() => useIframe}
              />
            </RemoteViewErrorBoundary>
          </section>
        ))}
      </RemoteViewProvider>
    );
  };
}

describe('remote-view', () => {
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

    // eslint-disable-next-line jest/no-commented-out-tests
    // it('should render using a custom loader', async () => {
    //   const Example = getMicrofrontendExample(
    //     true,
    //     <div>Custom loader</div>,
    //     undefined,
    //   );

    //   // eslint-disable-next-line testing-library/no-debugging-utils
    //   screen.debug();

    //   render(<Example />);

    //   await waitFor(() => screen.findByText('Custom loader'));

    //   const customLoader = screen.getByText('Custom loader');
    //   expect(customLoader).toBeInTheDocument();
    // });
  });

  describe('for unsupported manifests', () => {
    const consoleErrorFn = jest.spyOn(console, 'error');

    beforeEach(() => {
      let n = 0;
      global.fetch = jest.fn(() => {
        const manifest = n === 0 ? badManifestA : badManifestB;
        n += 1;

        return Promise.resolve({
          json: () => manifest,
        });
      }) as jest.Mock;

      consoleErrorFn.mockImplementation(() => jest.fn());
    });

    afterAll(() => {
      consoleErrorFn.mockRestore();
    });

    it('should throw and display the default error fallback', async () => {
      const Example = getMicrofrontendExample(false, undefined, undefined);
      render(<Example />);

      const failTextA =
        'Something went wrong: Can\'t load package bad-component-a because type is missing or not supported: "undefined"';
      const failTextB =
        'Something went wrong: Can\'t load package bad-component-b because type is missing or not supported: "view"';

      await waitFor(() => screen.findByText(failTextA));
      expect(screen.getByText(failTextA)).toBeInTheDocument();

      await waitFor(() => screen.findByText(failTextB));
      expect(screen.getByText(failTextB)).toBeInTheDocument();

      expect.any(TypeError);
    });

    it('should throw and display a custom error fallback', async () => {
      function CustomFallback({ message }: { message: string | undefined }) {
        const filteredMsgMatches = message?.match(/bad-component-(a|b)/);
        const filteredMsg = filteredMsgMatches?.length
          ? filteredMsgMatches[0]
          : '';
        return <div>Custom fallback component: {filteredMsg}</div>;
      }

      const Example = getMicrofrontendExample(false, undefined, CustomFallback);
      render(<Example />);

      const failTextA = 'Custom fallback component: bad-component-a';
      const failTextB = 'Custom fallback component: bad-component-b';

      await waitFor(() => screen.findByText(failTextA));
      expect(screen.getByText(failTextA)).toBeInTheDocument();

      await waitFor(() => screen.findByText(failTextB));
      expect(screen.getByText(failTextB)).toBeInTheDocument();

      expect.any(TypeError);
    });
  });
});
