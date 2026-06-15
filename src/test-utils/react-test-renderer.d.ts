// react-test-renderer ships no bundled types and we deliberately avoid adding a
// @types dependency for it. This ambient declaration types only the surface our
// test helper (test-utils/renderHook.tsx) uses, so the test suite stays strict
// without an implicit `any` import.
declare module "react-test-renderer" {
  import type { ReactElement } from "react";

  export interface ReactTestRenderer {
    update(element: ReactElement): void;
    unmount(): void;
    toJSON(): unknown;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): void;
}
