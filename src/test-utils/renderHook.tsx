import { act, create, type ReactTestRenderer } from "react-test-renderer";

type RenderHookResult<T> = {
  result: { current: T };
  rerender: () => void;
  unmount: () => void;
};

export const renderHook = <T,>(useHook: () => T): RenderHookResult<T> => {
  const result = {
    current: undefined as T,
  };

  let renderer: ReactTestRenderer;

  function HookHarness() {
    result.current = useHook();
    return null;
  }

  act(() => {
    renderer = create(<HookHarness />);
  });

  return {
    result,
    rerender: () => {
      act(() => {
        renderer.update(<HookHarness />);
      });
    },
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
};
