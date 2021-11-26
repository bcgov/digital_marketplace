/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  globals: {
    'ts-jest': {
      // use the tsconfig in the front-end testing folder (will need to update if we use Jest for back-end testing too)
      tsconfig: './tests/front-end/tsconfig.json',
      // turn off type-checking as part of jest tests
      diagnostics: false
    }
  }
  
};