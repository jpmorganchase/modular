import esbuild from 'esbuild';
import cssModules from 'postcss-modules';
import * as fs from 'fs/promises';
import * as path from 'path';
import postcss from 'postcss';
import tmp from 'tmp';
import crypto from 'crypto';

const hash = crypto.createHash('sha256');

const readFile = fs.readFile;
const writeFile = fs.writeFile;
const ensureDir = (dirname: string) => fs.mkdir(dirname, { recursive: true });

const pluginNamespace = 'esbuild-css-modules-plugin-namespace';

const buildCssModulesJS = async (cssFullPath: string, options: any) => {
  const {
    localsConvention = 'camelCaseOnly',
    inject = true,
    generateScopedName,
  } = options;

  const css = await readFile(cssFullPath);

  let cssModulesJSON = {};
  const result = await postcss([
    cssModules({
      localsConvention,
      generateScopedName,
      getJSON(_cssSourceFile, json) {
        cssModulesJSON = { ...json };
        return cssModulesJSON;
      },
    }),
  ]).process(css, {
    from: undefined,
    map: false,
  });

  const classNames = JSON.stringify(cssModulesJSON);
  hash.update(cssFullPath);
  const digest = hash.copy().digest('hex');
  return `
const digest = '${digest}';
const css = \`${result.css}\`;
${
  inject &&
  `
(function() {
  if (!document.getElementById(digest)) {
    var ele = document.createElement('style');
    ele.id = digest;
    ele.textContent = css;
    document.head.appendChild(ele);
  }
})();
`
}
export default ${classNames};
export { css, digest };
  `;
};

const CssModulesPlugin: (options?: any) => esbuild.Plugin = (options = {}) => {
  const plugin: esbuild.Plugin = {
    name: 'esbuild-css-modules-plugin',
    setup(build) {
      const rootDir = process.cwd();
      const tmpDirPath = tmp.dirSync().name;
      const { outdir, bundle } = build.initialOptions;

      async function onResolve(args: esbuild.OnResolveArgs) {
        const sourceFullPath = path.resolve(args.resolveDir, args.path);

        const sourceExt = path.extname(sourceFullPath);
        const sourceBaseName = path.basename(sourceFullPath, sourceExt);
        const sourceDir = path.dirname(sourceFullPath);
        const sourceRelDir = path.relative(path.dirname(rootDir), sourceDir);

        const tmpDir = path.resolve(tmpDirPath, sourceRelDir);
        await ensureDir(tmpDir);
        const tmpFilePath = path.resolve(tmpDir, `${sourceBaseName}.css`);

        const jsContent = await buildCssModulesJS(sourceFullPath, options);

        await writeFile(`${tmpFilePath}.js`, jsContent);

        if (outdir && !bundle) {
          const isOutdirAbsolute = path.isAbsolute(outdir);
          const absoluteOutdir = isOutdirAbsolute
            ? outdir
            : path.resolve(args.resolveDir, outdir);
          const isEntryAbsolute = path.isAbsolute(args.path);
          const entryRelDir = isEntryAbsolute
            ? path.dirname(path.relative(args.resolveDir, args.path))
            : path.dirname(args.path);

          const targetSubpath =
            absoluteOutdir.indexOf(entryRelDir) === -1
              ? path.join(entryRelDir, `${sourceBaseName}.css.js`)
              : `${sourceBaseName}.css.js`;
          const target = path.resolve(absoluteOutdir, targetSubpath);

          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.copyFile(`${tmpFilePath}.js`, target);
        }

        if (!bundle) {
          return { path: sourceFullPath, namespace: 'file' };
        }

        return {
          path: `${tmpFilePath}.js`,
          namespace: pluginNamespace,
          pluginData: {
            content: jsContent,
            resolveArgs: {
              path: args.path,
              importer: args.importer,
              namespace: args.namespace,
              resolveDir: args.resolveDir,
              kind: args.kind,
            },
          },
        };
      }

      async function onLoad(
        args: esbuild.OnLoadArgs,
      ): Promise<esbuild.OnLoadResult> {
        const { path: resolvePath, importer } = args.pluginData.resolveArgs;
        const importerName = path.basename(importer);

        return { contents: args.pluginData.content, loader: 'js' };
      }

      build.onResolve(
        { filter: /\.modules?\.css$/, namespace: 'file' },
        onResolve,
      );
      build.onLoad(
        { filter: /\.modules?\.css\.js$/, namespace: pluginNamespace },
        onLoad,
      );
    },
  };

  return plugin;
};

export default CssModulesPlugin();
