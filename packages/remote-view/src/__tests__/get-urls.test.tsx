import {
  esmViewUrlIsValid,
  getRemoteAssetUrl,
  getRemotePackageJsonUrl,
} from '../utils/get-urls';

const VALID_INPUTS = [
  // Absolute URLs, with optional trailing /
  'https://localhost:3030/my-card-view',
  'https://localhost:3030/my-card-view/',
  // HTTP also allowed
  'http://localhost:3030/my-card-view',
  'http://localhost:3030/my-card-view/',
  // Absolute URLs with deep paths
  'https://cdn.example.com/subpath/foo/my-card-view',
  'https://cdn.example.com/subpath/foo/my-card-view/',
  // Root-relative URLs
  '/my-card-view',
  '/my-card-view/',
  // Root-relative URLs with deep paths
  '/subpath/foo/my-card-view',
  '/subpath/foo/my-card-view/',
];

const INVALID_INPUTS = [
  // Plain /
  '/',
  // Relative path from current location
  './relpath/my-card-view',
  './relpath/my-card-view/',
  // No protocol, but no leading /
  'foo/my-card-view',
  'foo/my-card-view/',
  // Unsupported protocol
  'file:///Users/foo/subpath/my-card-view',
  'file:///Users/foo/subpath/my-card-view/',
];

describe('getUrls', () => {
  describe('should validate URLs supplied from user input', () => {
    describe('URLs considered valid', () => {
      VALID_INPUTS.forEach((remoteViewUrl) => {
        it(`allows ${remoteViewUrl}`, () => {
          expect(esmViewUrlIsValid(remoteViewUrl)).toBe(true);
        });
      });
    });

    describe('URLs considered invalid', () => {
      INVALID_INPUTS.forEach((remoteViewUrl) => {
        it(`prohibits ${remoteViewUrl}`, () => {
          expect(esmViewUrlIsValid(remoteViewUrl)).toBe(false);
        });
      });
    });
  });

  describe('should correctly point to package.json', () => {
    const EXPECTED_OUTCOMES = [
      'https://localhost:3030/my-card-view/package.json',
      'https://localhost:3030/my-card-view/package.json',
      'http://localhost:3030/my-card-view/package.json',
      'http://localhost:3030/my-card-view/package.json',
      'https://cdn.example.com/subpath/foo/my-card-view/package.json',
      'https://cdn.example.com/subpath/foo/my-card-view/package.json',
      '/my-card-view/package.json',
      '/my-card-view/package.json',
      '/subpath/foo/my-card-view/package.json',
      '/subpath/foo/my-card-view/package.json',
    ];

    VALID_INPUTS.forEach((validBaseUrl, index) => {
      it(`given the valid ESM View URL of "${validBaseUrl}", correctly points to package.json`, () => {
        expect(getRemotePackageJsonUrl(validBaseUrl)).toBe(
          EXPECTED_OUTCOMES[index],
        );
      });
    });
  });

  const SUPPORTED_ASSET_PATHS = {
    PRECEDING_SLASH: '/static/foo/bar.js',
    PRECEDING_DOT_SLASH: './static/foo/bar.js',
    ABSOLUTE_URL: 'https://cdn.example.com/foo/bar/module.js',
    NO_PREFIX: 'foo/bar/module.js',
  };

  const EXPECTED_ASSET_OUTPUTS: Record<string, Record<string, string>> = {
    'https://localhost:3030/my-card-view': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        'https://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        'https://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        'https://localhost:3030/my-card-view/foo/bar/module.js',
    },
    'https://localhost:3030/my-card-view/': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        'https://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        'https://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        'https://localhost:3030/my-card-view/foo/bar/module.js',
    },
    'http://localhost:3030/my-card-view': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        'http://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        'http://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        'http://localhost:3030/my-card-view/foo/bar/module.js',
    },
    'http://localhost:3030/my-card-view/': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        'http://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        'http://localhost:3030/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        'http://localhost:3030/my-card-view/foo/bar/module.js',
    },
    'https://cdn.example.com/subpath/foo/my-card-view': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        'https://cdn.example.com/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        'https://cdn.example.com/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        'https://cdn.example.com/subpath/foo/my-card-view/foo/bar/module.js',
    },
    'https://cdn.example.com/subpath/foo/my-card-view/': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        'https://cdn.example.com/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        'https://cdn.example.com/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        'https://cdn.example.com/subpath/foo/my-card-view/foo/bar/module.js',
    },
    '/my-card-view': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        '/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        '/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]: '/my-card-view/foo/bar/module.js',
    },
    '/my-card-view/': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        '/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        '/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]: '/my-card-view/foo/bar/module.js',
    },
    '/subpath/foo/my-card-view': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        '/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        '/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        '/subpath/foo/my-card-view/foo/bar/module.js',
    },
    '/subpath/foo/my-card-view/': {
      [SUPPORTED_ASSET_PATHS.PRECEDING_SLASH]:
        '/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH]:
        '/subpath/foo/my-card-view/static/foo/bar.js',
      [SUPPORTED_ASSET_PATHS.ABSOLUTE_URL]:
        'https://cdn.example.com/foo/bar/module.js',
      [SUPPORTED_ASSET_PATHS.NO_PREFIX]:
        '/subpath/foo/my-card-view/foo/bar/module.js',
    },
  };

  describe('should build static asset URLs corectly', () => {
    VALID_INPUTS.forEach((validBaseUrl) => {
      describe(`given an ESM View URL of ${validBaseUrl}`, () => {
        const expectedA =
          EXPECTED_ASSET_OUTPUTS[validBaseUrl][
            SUPPORTED_ASSET_PATHS.PRECEDING_SLASH
          ];
        it(`given the assetPath of "${SUPPORTED_ASSET_PATHS.PRECEDING_SLASH}", produces "${expectedA}"`, () => {
          expect(
            getRemoteAssetUrl(
              validBaseUrl,
              SUPPORTED_ASSET_PATHS.PRECEDING_SLASH,
            ),
          ).toBe(expectedA);
        });

        const expectedB =
          EXPECTED_ASSET_OUTPUTS[validBaseUrl][
            SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH
          ];
        it(`given the assetPath of "${SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH}", produces "${expectedB}"`, () => {
          expect(
            getRemoteAssetUrl(
              validBaseUrl,
              SUPPORTED_ASSET_PATHS.PRECEDING_DOT_SLASH,
            ),
          ).toBe(expectedB);
        });

        const expectedC =
          EXPECTED_ASSET_OUTPUTS[validBaseUrl][
            SUPPORTED_ASSET_PATHS.ABSOLUTE_URL
          ];
        it(`given the assetPath of "${SUPPORTED_ASSET_PATHS.ABSOLUTE_URL}", produces "${expectedC}"`, () => {
          expect(
            getRemoteAssetUrl(validBaseUrl, SUPPORTED_ASSET_PATHS.ABSOLUTE_URL),
          ).toBe(expectedC);
        });

        const expectedD =
          EXPECTED_ASSET_OUTPUTS[validBaseUrl][SUPPORTED_ASSET_PATHS.NO_PREFIX];
        it(`given the assetPath of "${SUPPORTED_ASSET_PATHS.NO_PREFIX}", produces "${expectedD}"`, () => {
          expect(
            getRemoteAssetUrl(validBaseUrl, SUPPORTED_ASSET_PATHS.NO_PREFIX),
          ).toBe(expectedD);
        });
      });
    });
  });
});
