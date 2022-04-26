const util = require('util');

function logObject(object) {
  console.log(
    util.inspect(
      object,
      (showHidden = false),
      (depth = Infinity),
      (colorize = true),
    ),
  );
}

class CDNCSSPlugin {
  constructor() {}
  apply(compiler) {
    compiler.hooks.compilation.tap(
      'CDNCSSPlugin',
      (compilation, { normalModuleFactory }) => {
        // normalModuleFactory.hooks.beforeResolve.tap(
        //   'CDNCSSPlugin',
        //   (resolveData) => {
        //     // console.log('CALLED afterResolve');
        //     // console.log(resolveData);
        //     // console.log('\n\n');
        //   },
        // );

        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('CDNCSSPlugin', (parser) => {
            parser.hooks.program.tap('CDNCSSPlugin', (ast, comments) => {
              // console.log(
              //   'INIT ----------------------------------------------------',
              // );

              ast.body.forEach((node) => {
                if (node.type === 'ImportDeclaration') {
                  if (
                    !node.source.value.startsWith('.') &&
                    node.source.value.endsWith('.css')
                  ) {
                    // You can't change the AST - https://stackoverflow.com/questions/53276520/webpack-plugin-change-content-with-asm
                    // logObject(node);
                  }
                }
              });

              // console.log(
              //   'ENDS ----------------------------------------------------',
              // );

              // ast.body[0].expression.arguments[0].value = 'bar';
              // ast.body[0].expression.arguments[0].raw = 'bar' // does not make any difference :(
            });

            parser.hooks.import.tap('CDNCSSPlugin', (statement, source) => {
              logObject({ statement, source });
            });
          });

        // normalModuleFactory.hooks.createModule.tap('CDNCSSPlugin', (data) => {
        //   console.log('create-module: raw-request: ' + data.rawRequest);
        // });
      },
    );
  }
}

module.exports = CDNCSSPlugin;
