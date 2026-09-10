import { useEffect, type RefObject } from "react";

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: PointerEvent) => void,
) {
  useEffect(() => {
    const listener = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        !ref.current ||
        ref.current.contains(target)
      ) {
        return;
      }
      handler(event);
    };

    document.addEventListener("pointerdown", listener);

    return () => {
      document.removeEventListener("pointerdown", listener);
    };
  }, [ref, handler]);
}
