export default [
  {
    files: [
      "src/constants.js",
      "src/rail/*.js",
      "src/state.js",
      "src/storage.js",
      "src/text.js",
      "test/*.js",
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
