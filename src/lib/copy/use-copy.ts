import { useSyncExternalStore } from "react";
import type { Copy } from "./en.ts";
import type { Language } from "./language.ts";
import {
  currentCopy,
  currentLanguage,
  setLanguage,
  subscribeLanguage,
} from "./store.ts";

export function useCopy(): Copy {
  return useSyncExternalStore(subscribeLanguage, currentCopy, currentCopy);
}

export function useLanguage(): {
  language: Language;
  setLanguage: (next: Language) => void;
} {
  const language = useSyncExternalStore(
    subscribeLanguage,
    currentLanguage,
    currentLanguage,
  );
  return { language, setLanguage };
}
