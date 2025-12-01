import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import cypressPlugin from "eslint-plugin-cypress";
import globals from "globals";
import jestPlugin from "eslint-plugin-jest";

export default [
  // Base ESLint recommended config
  js.configs.recommended,
  // Main configuration object
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2023,
        ...cypressPlugin.configs.recommended.languageOptions.globals
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react: reactPlugin,
      "@typescript-eslint": typescriptPlugin,
      cypress: cypressPlugin
    },
    rules: {
      // Include recommended rules from plugins
      ...reactPlugin.configs.recommended.rules,
      ...typescriptPlugin.configs.recommended.rules,
      ...cypressPlugin.configs.recommended.rules,

      // Your custom overrides
      "no-redeclare": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-empty-function": "off",
      "react/no-children-prop": "off",
      "@typescript-eslint/ban-ts-comment": "warn"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },

  {
    files: ["tests/**", "**/*.test.{js, ts}"],
    ...jestPlugin.configs["flat/recommended"]
  },

  // TypeScript-specific overrides
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          caughtErrorsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ]
    }
  }
];
