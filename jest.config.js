module.exports = {
  bail: true,
  setupFiles: ["./test-setup"],
  setupFilesAfterEnv: ["jest-expect-message"],
  testPathIgnorePatterns: ["/node_modules/", "/out/", "\\.js$"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
