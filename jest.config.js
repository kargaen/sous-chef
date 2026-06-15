module.exports = {
  clearMocks: true,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
};
