/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // this maps to the paths in the front-end tsconfig file so that the tests can find imports in front-end files
  moduleNameMapper: {
    "front-end/(.*)": "<rootDir>/src/front-end/typescript/$1",
    "shared/(.*)": "<rootDir>/src/shared/$1"
  },
  globals: {
    'ts-jest': {
      // use the tsconfig in the front-end testing folder (will need to update if we use Jest for back-end testing too)
      tsconfig: './tests/front-end/tsconfig.json',
      // turn off type-checking as part of jest tests
      diagnostics: false
    }
  },
  testPathIgnorePatterns: ["<rootDir>/cypress/"]
};
