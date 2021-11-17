import createEsbuildBrowserslistTarget from '../../utils/createEsbuildBrowserslistTarget';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { promisify } from 'util';
const mktempd = promisify(tmp.dir);

describe('createEsbuildBrowserslistTarget', () => {
  const cwd = process.cwd();
  let folder: string;

  beforeEach(async () => {
    folder = await mktempd();
  });

  afterEach(async () => {
    process.chdir(cwd);
    await fs.remove(folder);
  });

  it('creates a list of supported browsers', () => {
    fs.writeFileSync(
      `${folder}/package.json`,
      `
    "browserslist": {
        "development": [
          "chrome 95",
          "firefox 94",
          "safari 15",
        ]
      },
    `,
    );

    const result = createEsbuildBrowserslistTarget(process.cwd());
    expect(result).toEqual(['chrome95', 'firefox94', 'safari15']);
  });

  it('filters out unsupported browsers', () => {
    fs.writeFileSync(
      `${folder}/package.json`,
      `
    "browserslist": {
        "development": [
          "chrome 95",
          "firefox 94",
          "safari 15",
          "opera 80"
        ]
      },
    `,
    );

    const result = createEsbuildBrowserslistTarget(process.cwd());
    expect(result).toEqual(['chrome95', 'firefox94', 'safari15']);
  });

  it('filters out unsupported browser versions', () => {
    fs.writeFileSync(
      `${folder}/package.json`,
      `
    "browserslist": {
        "development": [
          "chrome 95",
          "firefox 94",
          "safari 15",
          "unreleased safari versions"
        ]
      },
    `,
    );

    const result = createEsbuildBrowserslistTarget(process.cwd());
    expect(result).toEqual(['chrome95', 'firefox94', 'safari15']);
  });
});
