module.exports = {
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    // "prettier",
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true,
    },
      "ecmaVersion": 13,
      "sourceType": "module",
    },
    "plugins": ["react", "@typescript-eslint"],
    "rules": {
        // TODO remove rule overrides that affect code quality
      "@typescript-eslint/no-explicit-any": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-useless-escape": "error",
      "react/no-unescaped-entities": "off",
      "no-case-declarations": "off",
      "no-undef": "warn",
      "no-fallthrough": "error",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/ban-types": "off",
      "react/display-name": "off",
      "react/no-children-prop": "off",
      "no-duplicate-case": "error",
      "react/jsx-key": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "react/jsx-no-target-blank": "off",
  },
};
