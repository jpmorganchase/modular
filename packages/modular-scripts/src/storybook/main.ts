import path from "path";


if (!process.env.MODULAR_ROOT) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_ROOT not found in environment, did you forget to pass it when calling cli.ts?',
  );
}

module.exports = {
  "stories": [
    path.join(process.env.MODULAR_ROOT, "packages/**/*.stories.@(js|jsx|ts|tsx|mdx)")
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials"
  ]
}
