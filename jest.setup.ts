globalThis.IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

const originalConsoleError = console.error;

console.error = (...args) => {
  const [firstArg] = args;

  if (
    typeof firstArg === "string" &&
    firstArg.includes("react-test-renderer is deprecated")
  ) {
    return;
  }

  originalConsoleError(...args);
};
