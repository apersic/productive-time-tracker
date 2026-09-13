export const LANGUAGES = ["en", "hr"] as const;

export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_ENDONYM: Record<Language, string> = {
  en: "English",
  hr: "Hrvatski",
};

export function parseLanguage(value: unknown): Language | undefined {
  if (value === "en" || value === "hr") {
    return value;
  }
  return undefined;
}

function languageFromBrowserTag(tag: string): Language | undefined {
  const lower = tag.toLowerCase();
  if (lower === "hr" || lower.startsWith("hr-")) {
    return "hr";
  }
  if (lower === "en" || lower.startsWith("en-")) {
    return "en";
  }
  return undefined;
}

export function languageFromBrowser(
  browserLanguages: readonly string[],
): Language {
  for (const tag of browserLanguages) {
    const language = languageFromBrowserTag(tag);
    if (language !== undefined) {
      return language;
    }
  }
  return "en";
}

export function resolveLanguage(args: {
  saved: Language | undefined;
  browserLanguages: readonly string[];
}): Language {
  if (args.saved !== undefined) {
    return args.saved;
  }
  return languageFromBrowser(args.browserLanguages);
}
