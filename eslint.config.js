const js = require("@eslint/js");
const globals = require("globals");
module.exports = [
  {
    ignores: [
      ".astro/**",
      "dist/**",
      "node_modules/**",
      "public/env.js",
      "coverage/**",
      "test-results/**",
      "src/**/*.astro",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["src/lib/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{js,cjs}"],
    ignores: ["src/lib/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["public/script.js", "src/scripts/terminal.js"],
    rules: {
      "no-unused-vars": "off",
      "no-case-declarations": "off",
      "no-useless-assignment": "off",
      "no-undef": "off",
    },
  },
];
