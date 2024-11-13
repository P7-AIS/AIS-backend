module.exports = {
  silent: true, // silence console.log and console.error
  // verbose: true, // show test titles
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  //   setupFilesAfterEnv: ['<rootDir>/singleton.ts'], // if you're using mocking as discussed earlier
}
