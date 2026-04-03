export default [
  {
    files: [
      // Phase 1: Limited scope matching original config
      // Will expand gradually as files are migrated to TypeScript
      "src/constants.js",
      "src/rail/*.js",
      "src/state.js",
      "src/storage.js",
      "src/text.js",
      "test/**/*.js",
      "eslint.config.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        chrome: "readonly",
        console: "readonly",
        document: "readonly",
        window: "readonly",
        process: "readonly",
      },
    },
    rules: {
      eqeqeq: "error",
      "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }],
    },
  },
];
