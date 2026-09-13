export {
  LANGUAGES,
  LANGUAGE_ENDONYM,
  parseLanguage,
  languageFromBrowser,
  resolveLanguage,
  type Language,
} from "./language.ts";
export { copyFor, currentCopy, currentLanguage, setLanguage } from "./store.ts";
export { useCopy, useLanguage } from "./use-copy.ts";
export type { Copy } from "./en.ts";
