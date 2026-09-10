import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function getWidth() {
  return window.innerWidth;
}

function getHeight() {
  return window.innerHeight;
}

export function useWindowSize() {
  const width = useSyncExternalStore(subscribe, getWidth);
  const height = useSyncExternalStore(subscribe, getHeight);

  return { width, height };
}
