import { normalizeToPosix } from '../../esbuild-scripts/utils/formatPath';

describe('Normalize path to Posix', () => {
  it('should convert a Win32 path into a Posix path', () => {
    expect(normalizeToPosix('\\this\\is\\my\\win32\\path')).toBe(
      '/this/is/my/win32/path',
    );
  });
  it('should convert a mixed path into a Posix path', () => {
    expect(normalizeToPosix('/this/is\\my/mixed\\path')).toBe(
      '/this/is/my/mixed/path',
    );
  });
  it('should leave a Posix path untouched', () => {
    expect(normalizeToPosix('/this/is/my/posix/path')).toBe(
      '/this/is/my/posix/path',
    );
  });
  it('should return undefined if undefined is passed', () => {
    expect(normalizeToPosix(undefined)).toBeUndefined();
  });
  it('should convert a relative path to a relative Posix path', () => {
    expect(normalizeToPosix('this\\is/my/relative\\mixed/path')).toBe(
      'this/is/my/relative/mixed/path',
    );
  });
});
