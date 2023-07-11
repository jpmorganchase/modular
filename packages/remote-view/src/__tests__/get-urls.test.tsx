import { getRemoteAssetUrl, getRemotePackageJsonUrl } from '../utils/getUrls';

describe('getUrls', () => {
  it('should build the package.json URL correctly', () => {
    // Trailing slash in base URL
    expect(getRemotePackageJsonUrl('https://localhost:3030/')).toBe(
      'https://localhost:3030/package.json',
    );

    // No trailing slash in base URL
    expect(getRemotePackageJsonUrl('https://localhost:3030')).toBe(
      'https://localhost:3030/package.json',
    );
  });

  it('should build static asset URLs corectly', () => {
    // Preceding `/`
    expect(getRemoteAssetUrl('https://localhost:3030', '/static/foo.js')).toBe(
      'https://localhost:3030/static/foo.js',
    );

    // Preceding `./`
    expect(getRemoteAssetUrl('https://localhost:3030', './static/foo.js')).toBe(
      'https://localhost:3030/static/foo.js',
    );

    // Absolute URL
    expect(
      getRemoteAssetUrl(
        'https://localhost:3030',
        'https://localhost:4040/static/foo.js',
      ),
    ).toBe('https://localhost:4040/static/foo.js');

    // No prefix
    expect(getRemoteAssetUrl('https://localhost:3030', 'static/foo.js')).toBe(
      'https://localhost:3030/static/foo.js',
    );
  });
});
