module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePaths: ["<rootDir>/src/"],
  setupFiles: ["jest-chrome"],
  setupFilesAfterEnv: ["./jest.setup.js"],
};
