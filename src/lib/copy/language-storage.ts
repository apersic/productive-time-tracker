import { parseLanguage, type Language } from "./language.ts";

const STORAGE_KEY = "productive-time-tracker.language";

export function loadLanguage(): Language | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return undefined;
    }
    return parseLanguage(raw);
  } catch {
    return undefined;
  }
}

export function saveLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    return;
  }
}
