import * as ESlint from 'eslint';
import ModularNoPrivateImports from './ModularNoPrivateImports';

interface Plugin {
  rules: Record<string, ESlint.Rule.RuleModule>;
}

const plugin: Plugin = {
  rules: {
    'no-private-imports': ModularNoPrivateImports,
  },
};

export default plugin;
