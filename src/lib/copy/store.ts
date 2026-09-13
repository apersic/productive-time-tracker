import { en, type Copy } from "./en.ts";
import { hr } from "./hr.ts";
import type { Language } from "./language.ts";
import { resolveLanguage } from "./language.ts";
import { loadLanguage, saveLanguage } from "./language-storage.ts";

const CATALOGS: Record<Language, Copy> = { en, hr };

export function copyFor(language: Language): Copy {
  return CATALOGS[language];
}

let active: Language | undefined;
const listeners = new Set<() => void>();

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") {
    return [];
  }
  if (navigator.languages.length > 0) {
    return navigator.languages;
  }
  if (navigator.language.length > 0) {
    return [navigator.language];
  }
  return [];
}

function apply(language: Language): Language {
  active = language;
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
  return language;
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function currentLanguage(): Language {
  if (active !== undefined) {
    return active;
  }
  return apply(
    resolveLanguage({
      saved: loadLanguage(),
      browserLanguages: browserLanguages(),
    }),
  );
}

export function currentCopy(): Copy {
  return copyFor(currentLanguage());
}

export function setLanguage(next: Language): void {
  if (next === currentLanguage()) {
    return;
  }
  apply(next);
  saveLanguage(next);
  notify();
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
