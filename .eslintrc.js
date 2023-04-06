module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  globals: {
    gruntConfig: "readonly"
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:cypress/recommended"
    // "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 13,
    sourceType: "module"
  },
  plugins: ["react", "@typescript-eslint", "cypress"],
  rules: {
    // TODO remove rule overrides that affect code quality
    "@typescript-eslint/no-explicit-any": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-empty-function": "off",
    "react/no-children-prop": "off",
    "@typescript-eslint/ban-ts-comment": "warn"
  },
  overrides: [
    {
      // enable the rule specifically for TypeScript files
      files: ["*.ts", "*.tsx"],
      rules: {
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            ignoreRestSiblings: true
          }
        ]
      }
    }
  ],
  settings: {
    react: {
      version: "detect"
    }
  }
};
